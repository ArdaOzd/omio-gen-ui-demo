"""Read-only backend availability probe for the reported three-leg conversation."""
import collections
import datetime
import json
import os
import pathlib
import urllib.parse
import urllib.request

base = os.environ.get('OMIO_FARE_URL', 'http://127.0.0.1:8094')
def read(path):
    with urllib.request.urlopen(base + path, timeout=10) as response:
        return json.load(response)

locations = {item['id']: item for item in read('/api/locations')['locations']}
legs = []
for origin, destination, date in [
    ('barcelona', 'prague', '2026-10-03'),
    ('prague', 'paris', '2026-10-05'),
    ('paris', 'prague', '2026-10-10'),
]:
    parameters = dict(origin=origin, destination=destination, departure_date=date,
                      passengers=1, page=1, limit=100, sort='price_asc', mode='all')
    outbound = read('/api/search?' + urllib.parse.urlencode(parameters))['outbound']
    counts = dict(collections.Counter(row['mode'] for row in outbound['results']))
    assert outbound['pages'] <= 1, 'Probe must exhaust the complete date result'
    route = next((route for route in locations[origin]['destinations']
                  if route['id'] == destination), None)
    legs.append(dict(origin=origin, destination=destination, date=date,
                     total=outbound['total'], pages=outbound['pages'],
                     modeCounts=counts, trainBusCount=counts.get('train', 0) + counts.get('bus', 0),
                     routePresent=route is not None, supportedModes=route['modes'] if route else []))
assert [leg['total'] for leg in legs] == [0, 3, 3]
assert all(leg['trainBusCount'] == 0 for leg in legs)
assert not legs[0]['routePresent']
assert legs[1]['supportedModes'] == legs[2]['supportedModes'] == ['flight']
result = dict(timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              classification='actual synthetic backend availability; no model or user-session edits',
              baseUrl=base, passengers=1, legs=legs,
              conclusion='No requested train/bus fares. Barcelona-Prague is absent; Prague-Paris and Paris-Prague support flight only. Requested coverage modes do not imply availability.')
pathlib.Path(__file__).with_name('backend-availability.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
