"""Read-only fixture preflight for the predeclared fixed and withheld study tasks."""
import argparse
import json
import sqlite3
from contextlib import closing
from datetime import date, timedelta
from pathlib import Path
from backend.app import dispatch, _source_version

def verify(database: Path):
    generation = _source_version(database)
    with closing(sqlite3.connect(f"file:{database.resolve()}?mode=ro", uri=True)) as connection:
        metadata = dict(connection.execute("SELECT key, value FROM metadata"))
    observations = []
    primary_dates = [(date(2026, 10, 9) + timedelta(days=offset)).isoformat() for offset in range(7)]
    for origin, destination, days in [('london', 'paris', primary_dates + ['2026-10-20', '2026-10-22']), ('paris', 'barcelona', ['2026-10-11'])]:
        for day in days:
            status, payload = dispatch(database, '/api/search', {'origin': [origin], 'destination': [destination], 'departure_date': [day], 'passengers': ['1'], 'limit': ['1']})
            if status != 200 or payload.get('source_version') != generation:
                raise RuntimeError('Task coverage source or API response changed')
            outbound = payload['outbound']
            modes = {mode: facts['count'] for mode, facts in outbound['mode_summaries'].items()}
            if outbound['total'] <= 5 or modes['train'] == 0 or (origin == 'london' and modes['bus'] == 0):
                raise RuntimeError(f'Mandatory task actions lack meaningful rows: {origin}->{destination} {day}')
            observations.append({'origin': origin, 'destination': destination, 'date': day, 'availableFareCount': outbound['total'], 'availableByMode': modes})
    if _source_version(database) != generation:
        raise RuntimeError('Fixture changed during task coverage verification')
    return {'classification': 'read-only task eligibility; no model calls', 'sourceVersion': generation, 'globalFixtureDateBounds': {'from': metadata['start_date'], 'to': metadata['end_date']}, 'loadedResourceWindow': {'from': '2026-10-09', 'to': '2026-10-15'}, 'fixedAndWithheldWindow': {'from': '2026-10-09', 'to': '2026-10-15'}, 'actionDates': {'localSelection': '2026-10-10', 'multiCitySecondLeg': '2026-10-11', 'slowCoverage': '2026-10-20', 'latestCoverage': '2026-10-22'}, 'observations': observations, 'eligibleFamilies': ['cheap-fast','train-bus','calendar','multi-city','rearrange','text-state','local-controls','coverage','stream-edit','two-artifacts','reload','recovery'], 'intentionalEmptyModes': ['London→Paris ferry', 'Paris→Barcelona bus/ferry'], 'limits': 'Proves source data availability, not that a generated scene binds correct resource coverage or exposes required controls. Missing bindings or controls remain failed study cells.'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database', type=Path)
    print(json.dumps(verify(parser.parse_args().database), indent=2))
