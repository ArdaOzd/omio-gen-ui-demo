"""Closed, server-side fare projections for generative UI clients."""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import re
import sqlite3
import time
from dataclasses import dataclass
from datetime import date, timedelta
from http import HTTPStatus
from typing import Never


MODES = ("train", "bus", "flight", "ferry")
SORT_FIELDS = {
    "priceCents": "f.price_cents",
    "durationMinutes": "f.duration_minutes",
    "departureMinutes": "departure_minutes",
}
MAX_GROUPS = 8
MAX_PROJECTIONS = 8
MAX_CALENDAR_DAYS = 732
MAX_LOOKUP_PINS = 160
MAX_CURSOR_LENGTH = 2_048
QUERY_TIMEOUT_SECONDS = 8.0
REF_PATTERN = re.compile(r"^[a-zA-Z0-9_.:-]+$")
MAX_SAFE_INTEGER = 9_007_199_254_740_991


@dataclass(frozen=True)
class QueryApiError(Exception):
    status: HTTPStatus
    code: str
    message: str


def _fail(code: str, message: str, status: HTTPStatus = HTTPStatus.BAD_REQUEST) -> Never:
    raise QueryApiError(status, code, message)


def _object(value: object, field: str, keys: set[str]) -> dict[str, object]:
    if not isinstance(value, dict):
        _fail("invalidRequest", f"{field} must be an object.")
    unknown = set(value) - keys
    if unknown:
        _fail("invalidRequest", f"{field} contains unsupported fields: {', '.join(sorted(unknown))}.")
    return value


def _required(value: dict[str, object], field: str, owner: str) -> object:
    if field not in value:
        _fail("invalidRequest", f"{owner}.{field} is required.")
    return value[field]


def _string(value: object, field: str, *, maximum: int = 96) -> str:
    if (
        not isinstance(value, str)
        or not value
        or len(value) > maximum
        or REF_PATTERN.fullmatch(value) is None
    ):
        _fail("invalidRequest", f"{field} must be a stable identifier of at most {maximum} characters.")
    return value


def _integer(value: object, field: str, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        _fail("invalidRequest", f"{field} must be an integer from {minimum} through {maximum}.")
    return value


def _date(value: object, field: str) -> date:
    if not isinstance(value, str):
        _fail("invalidRequest", f"{field} must use YYYY-MM-DD.")
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        _fail("invalidRequest", f"{field} must use YYYY-MM-DD.")
    if parsed.isoformat() != value:
        _fail("invalidRequest", f"{field} must use YYYY-MM-DD.")
    return parsed


def _canonical(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _fingerprint(prefix: str, value: object) -> str:
    digest = hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()
    return f"{prefix}-{digest[:32]}"


def _stable_fingerprint(prefix: str, value: object) -> str:
    return f"{prefix}-{stable_ref(_canonical(value))}"


def stable_ref(value: str) -> str:
    """Match resource-loader.ts's unsigned 32-bit FNV-1a base-36 identity."""
    result = 2_166_136_261
    for character in value:
        result ^= ord(character)
        result = (result * 16_777_619) & 0xFFFFFFFF
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    if result == 0:
        return "0"
    encoded = ""
    while result:
        result, remainder = divmod(result, 36)
        encoded = alphabet[remainder] + encoded
    return encoded


def _parse_filters(value: object, field: str) -> dict[str, object]:
    filters = _object(
        value,
        field,
        {
            "modes",
            "carrierIds",
            "directOnly",
            "minPriceCents",
            "maxPriceCents",
            "maxDurationMinutes",
        },
    )
    for required in ("modes", "carrierIds", "directOnly"):
        _required(filters, required, field)
    raw_modes = filters["modes"]
    if not isinstance(raw_modes, list) or len(raw_modes) > len(MODES):
        _fail("invalidRequest", f"{field}.modes must contain at most four modes.")
    modes: list[str] = []
    for index, raw_mode in enumerate(raw_modes):
        mode = _string(raw_mode, f"{field}.modes[{index}]", maximum=16)
        if mode not in MODES or mode in modes:
            _fail("invalidRequest", f"{field}.modes must contain unique supported modes.")
        modes.append(mode)
    raw_carriers = filters["carrierIds"]
    if not isinstance(raw_carriers, list) or len(raw_carriers) > 20:
        _fail("invalidRequest", f"{field}.carrierIds must contain at most 20 IDs.")
    carrier_ids: list[str] = []
    for index, raw_carrier in enumerate(raw_carriers):
        carrier = _string(raw_carrier, f"{field}.carrierIds[{index}]")
        if carrier in carrier_ids:
            _fail("invalidRequest", f"{field}.carrierIds must be unique.")
        carrier_ids.append(carrier)
    direct_only = filters["directOnly"]
    if not isinstance(direct_only, bool):
        _fail("invalidRequest", f"{field}.directOnly must be a boolean.")
    parsed: dict[str, object] = {
        "modes": modes,
        "carrierIds": carrier_ids,
        "directOnly": direct_only,
    }
    for optional in ("minPriceCents", "maxPriceCents", "maxDurationMinutes"):
        if optional in filters:
            minimum = 1 if optional == "maxDurationMinutes" else 0
            parsed[optional] = _integer(filters[optional], f"{field}.{optional}", minimum, MAX_SAFE_INTEGER)
    if (
        "minPriceCents" in parsed
        and "maxPriceCents" in parsed
        and int(parsed["minPriceCents"]) > int(parsed["maxPriceCents"])
    ):
        _fail("invalidRequest", f"{field}.minPriceCents cannot exceed maxPriceCents.")
    return parsed


def _parse_scope(value: object, field: str) -> dict[str, object]:
    scope = _object(
        value,
        field,
        {"kind", "originId", "destinationId", "dateWindow", "passengers", "earliestDeparture"},
    )
    if _required(scope, "kind", field) != "fareScope":
        _fail("invalidRequest", f"{field}.kind must be fareScope.")
    origin = _string(_required(scope, "originId", field), f"{field}.originId")
    destination = _string(_required(scope, "destinationId", field), f"{field}.destinationId")
    if origin == destination:
        _fail("invalidRequest", f"{field}.destinationId must differ from originId.")
    window = _object(_required(scope, "dateWindow", field), f"{field}.dateWindow", {"from", "to"})
    start = _date(_required(window, "from", f"{field}.dateWindow"), f"{field}.dateWindow.from")
    end = _date(_required(window, "to", f"{field}.dateWindow"), f"{field}.dateWindow.to")
    if end < start:
        _fail("invalidRequest", f"{field}.dateWindow.to must be on or after from.")
    if (end - start).days + 1 > MAX_CALENDAR_DAYS:
        _fail("invalidRequest", f"{field}.dateWindow cannot exceed {MAX_CALENDAR_DAYS} days.")
    threshold = _object(
        _required(scope, "earliestDeparture", field),
        f"{field}.earliestDeparture",
        {"date", "minutes"},
    )
    threshold_date = _date(
        _required(threshold, "date", f"{field}.earliestDeparture"),
        f"{field}.earliestDeparture.date",
    )
    if not start <= threshold_date <= end:
        _fail("invalidRequest", f"{field}.earliestDeparture.date must be inside dateWindow.")
    threshold_minutes = _integer(
        _required(threshold, "minutes", f"{field}.earliestDeparture"),
        f"{field}.earliestDeparture.minutes",
        0,
        1_439,
    )
    return {
        "kind": "fareScope",
        "originId": origin,
        "destinationId": destination,
        "dateWindow": {"from": start.isoformat(), "to": end.isoformat()},
        "passengers": _integer(_required(scope, "passengers", field), f"{field}.passengers", 1, 8),
        "earliestDeparture": {"date": threshold_date.isoformat(), "minutes": threshold_minutes},
    }


def _parse_projection(value: object, field: str, scope: dict[str, object]) -> dict[str, object]:
    base = _object(value, field, set(value) if isinstance(value, dict) else set())
    kind = _string(_required(base, "kind", field), f"{field}.kind", maximum=32)
    allowed = {
        "farePage": {"projectionId", "kind", "filters", "serviceDate", "sort", "after", "limit"},
        "calendarDays": {"projectionId", "kind", "filters", "objective"},
        "carrierFacets": {"projectionId", "kind", "filters"},
        "modeSummary": {"projectionId", "kind", "filters", "baseline"},
        "fareHighlights": {"projectionId", "kind", "filters"},
    }
    if kind not in allowed:
        _fail("invalidRequest", f"{field}.kind is unsupported.")
    projection = _object(value, field, allowed[kind])
    parsed: dict[str, object] = {
        "projectionId": _string(_required(projection, "projectionId", field), f"{field}.projectionId"),
        "kind": kind,
        "filters": _parse_filters(_required(projection, "filters", field), f"{field}.filters"),
    }
    if kind == "farePage":
        raw_date = _required(projection, "serviceDate", field)
        if raw_date is None:
            parsed["serviceDate"] = None
        else:
            service_date = _date(raw_date, f"{field}.serviceDate")
            window = scope["dateWindow"]
            assert isinstance(window, dict)
            if not date.fromisoformat(str(window["from"])) <= service_date <= date.fromisoformat(str(window["to"])):
                _fail("invalidRequest", f"{field}.serviceDate must be inside the scope dateWindow.")
            parsed["serviceDate"] = service_date.isoformat()
        sort = _object(_required(projection, "sort", field), f"{field}.sort", {"field", "direction"})
        sort_field = _string(_required(sort, "field", f"{field}.sort"), f"{field}.sort.field", maximum=32)
        direction = _string(_required(sort, "direction", f"{field}.sort"), f"{field}.sort.direction", maximum=8)
        if sort_field not in SORT_FIELDS or direction not in ("asc", "desc"):
            _fail("invalidRequest", f"{field}.sort is unsupported.")
        parsed["sort"] = {"field": sort_field, "direction": direction}
        after = _required(projection, "after", field)
        if after is not None and (not isinstance(after, str) or not after or len(after) > MAX_CURSOR_LENGTH):
            _fail("invalidRequest", f"{field}.after must be null or an opaque cursor of at most {MAX_CURSOR_LENGTH} characters.")
        parsed["after"] = after
        parsed["limit"] = _integer(_required(projection, "limit", field), f"{field}.limit", 1, 100)
    elif kind == "calendarDays":
        objective = _string(_required(projection, "objective", field), f"{field}.objective", maximum=16)
        if objective not in ("cheapest", "fastest"):
            _fail("invalidRequest", f"{field}.objective must be cheapest or fastest.")
        parsed["objective"] = objective
    elif kind == "modeSummary":
        baseline = _string(_required(projection, "baseline", field), f"{field}.baseline", maximum=32)
        if baseline not in ("withoutModeFilter", "active"):
            _fail("invalidRequest", f"{field}.baseline must be withoutModeFilter or active.")
        parsed["baseline"] = baseline
    return parsed


def parse_query_groups_request(value: object) -> dict[str, object]:
    request = _object(value, "request", {"version", "requestId", "expectedSourceVersion", "groups"})
    version = _required(request, "version", "request")
    if isinstance(version, bool) or version != 1:
        _fail("invalidRequest", "request.version must be 1.")
    request_id = _string(_required(request, "requestId", "request"), "request.requestId")
    expected = _required(request, "expectedSourceVersion", "request")
    if expected is not None:
        expected = _string(expected, "request.expectedSourceVersion")
    groups = _required(request, "groups", "request")
    if not isinstance(groups, list) or not 1 <= len(groups) <= MAX_GROUPS:
        _fail("invalidRequest", f"request.groups must contain 1 through {MAX_GROUPS} groups.")
    parsed_groups: list[dict[str, object]] = []
    group_ids: set[str] = set()
    for group_index, raw_group in enumerate(groups):
        field = f"request.groups[{group_index}]"
        group = _object(raw_group, field, {"groupId", "scope", "projections"})
        group_id = _string(_required(group, "groupId", field), f"{field}.groupId")
        if group_id in group_ids:
            _fail("invalidRequest", "request.groups must use unique groupId values.")
        group_ids.add(group_id)
        scope = _parse_scope(_required(group, "scope", field), f"{field}.scope")
        raw_projections = _required(group, "projections", field)
        if not isinstance(raw_projections, list) or len(raw_projections) > MAX_PROJECTIONS:
            _fail("invalidRequest", f"{field}.projections must contain at most {MAX_PROJECTIONS} projections.")
        projections = [
            _parse_projection(raw, f"{field}.projections[{index}]", scope)
            for index, raw in enumerate(raw_projections)
        ]
        projection_ids = [str(projection["projectionId"]) for projection in projections]
        if len(projection_ids) != len(set(projection_ids)):
            _fail("invalidRequest", f"{field}.projections must use unique projectionId values.")
        parsed_groups.append({"groupId": group_id, "scope": scope, "projections": projections})
    return {"version": 1, "requestId": request_id, "expectedSourceVersion": expected, "groups": parsed_groups}


def parse_lookup_request(value: object) -> dict[str, object]:
    request = _object(value, "request", {"version", "requestId", "sourceVersion", "pins"})
    version = _required(request, "version", "request")
    if isinstance(version, bool) or version != 1:
        _fail("invalidRequest", "request.version must be 1.")
    request_id = _string(_required(request, "requestId", "request"), "request.requestId")
    source_version = _string(_required(request, "sourceVersion", "request"), "request.sourceVersion")
    pins = _required(request, "pins", "request")
    if not isinstance(pins, list) or not 1 <= len(pins) <= MAX_LOOKUP_PINS:
        _fail("invalidRequest", f"request.pins must contain 1 through {MAX_LOOKUP_PINS} pins.")
    parsed: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for index, raw_pin in enumerate(pins):
        field = f"request.pins[{index}]"
        pin = _object(raw_pin, field, {"fareId", "resourceKey"})
        fare_id = _string(_required(pin, "fareId", field), f"{field}.fareId")
        resource_key = _string(_required(pin, "resourceKey", field), f"{field}.resourceKey")
        identity = (resource_key, fare_id)
        if identity in seen:
            _fail("invalidRequest", "request.pins must not contain duplicate resourceKey and fareId pairs.")
        seen.add(identity)
        parsed.append({"fareId": fare_id, "resourceKey": resource_key})
    return {"version": 1, "requestId": request_id, "sourceVersion": source_version, "pins": parsed}


def _minute_expression(alias: str = "f") -> str:
    return f"(CAST(substr({alias}.departure_time, 12, 2) AS INTEGER) * 60 + CAST(substr({alias}.departure_time, 15, 2) AS INTEGER))"


FARE_SELECT = f"""
SELECT f.id, origin.slug AS origin_id, destination.slug AS destination_id,
       f.service_date, r.mode, c.name AS carrier_name, f.price_cents,
       f.duration_minutes, {_minute_expression()} AS departure_minutes,
       f.available_seats
FROM fares f
JOIN routes r ON r.id = f.route_id
JOIN locations origin ON origin.id = r.origin_location_id
JOIN locations destination ON destination.id = r.destination_location_id
JOIN companies c ON c.id = f.company_id
"""


def _fare_item(row: sqlite3.Row) -> dict[str, object]:
    carrier_name = row["carrier_name"]
    return {
        "id": f'fare_{int(row["id"]):09d}',
        "originId": row["origin_id"],
        "destinationId": row["destination_id"],
        "serviceDate": row["service_date"],
        "mode": row["mode"],
        "carrierId": f"carrier-{stable_ref(carrier_name)}",
        "carrierName": carrier_name,
        "priceCents": int(row["price_cents"]),
        "durationMinutes": int(row["duration_minutes"]),
        "departureMinutes": int(row["departure_minutes"]),
        "availableSeats": int(row["available_seats"]),
        "currency": "EUR",
        "synthetic": True,
        "priceBasis": "per-passenger-including-demo-fees",
        "direct": True,
    }


def _company_ids(connection: sqlite3.Connection, carrier_ids: list[str]) -> list[int]:
    if not carrier_ids:
        return []
    requested = set(carrier_ids)
    return [
        int(row["id"])
        for row in connection.execute("SELECT id, name FROM companies")
        if f'carrier-{stable_ref(row["name"])}' in requested
    ]


def _where(
    connection: sqlite3.Connection,
    scope: dict[str, object],
    filters: dict[str, object] | None,
    *,
    service_date: str | None = None,
    ignore_carriers: bool = False,
    ignore_modes: bool = False,
) -> tuple[str, list[object]]:
    window = scope["dateWindow"]
    threshold = scope["earliestDeparture"]
    assert isinstance(window, dict) and isinstance(threshold, dict)
    clauses = [
        "origin.slug = ?",
        "destination.slug = ?",
        "f.service_date BETWEEN ? AND ?",
        "f.available_seats >= ?",
        "f.available_seats > 0",
        f"(f.service_date > ? OR (f.service_date = ? AND {_minute_expression()} >= ?))",
    ]
    parameters: list[object] = [
        scope["originId"],
        scope["destinationId"],
        window["from"],
        window["to"],
        scope["passengers"],
        threshold["date"],
        threshold["date"],
        threshold["minutes"],
    ]
    if service_date is not None:
        clauses.append("f.service_date = ?")
        parameters.append(service_date)
    if filters is not None:
        modes = filters["modes"]
        assert isinstance(modes, list)
        if modes and not ignore_modes:
            clauses.append(f"r.mode IN ({','.join('?' for _ in modes)})")
            parameters.extend(modes)
        carriers = filters["carrierIds"]
        assert isinstance(carriers, list)
        if carriers and not ignore_carriers:
            matching_ids = _company_ids(connection, carriers)
            if matching_ids:
                clauses.append(f"f.company_id IN ({','.join('?' for _ in matching_ids)})")
                parameters.extend(matching_ids)
            else:
                clauses.append("0 = 1")
        for field, sql in (
            ("minPriceCents", "f.price_cents >= ?"),
            ("maxPriceCents", "f.price_cents <= ?"),
            ("maxDurationMinutes", "f.duration_minutes <= ?"),
        ):
            if field in filters:
                clauses.append(sql)
                parameters.append(filters[field])
        # All clean-source routes are direct. directOnly is therefore already satisfied.
    return " AND ".join(clauses), parameters


def _scope_exists(connection: sqlite3.Connection, scope: dict[str, object], metadata: dict[str, str]) -> None:
    window = scope["dateWindow"]
    assert isinstance(window, dict)
    if window["from"] < metadata["start_date"] or window["to"] > metadata["end_date"]:
        _fail("unknownScope", "The requested date window is outside the fare source coverage.")
    route = connection.execute(
        """
        SELECT 1 FROM routes r
        JOIN locations origin ON origin.id = r.origin_location_id
        JOIN locations destination ON destination.id = r.destination_location_id
        WHERE origin.slug = ? AND destination.slug = ? LIMIT 1
        """,
        (scope["originId"], scope["destinationId"]),
    ).fetchone()
    if route is None:
        _fail("unknownScope", "The requested origin and destination are not a known fare scope.")


def _manifest(connection: sqlite3.Connection, scope: dict[str, object], source_version: str) -> dict[str, object]:
    where, parameters = _where(connection, scope, None)
    rows = connection.execute(
        f"""
        SELECT r.mode, COUNT(*) AS count
        FROM fares f
        JOIN routes r ON r.id = f.route_id
        JOIN locations origin ON origin.id = r.origin_location_id
        JOIN locations destination ON destination.id = r.destination_location_id
        WHERE {where}
        GROUP BY r.mode
        """,
        parameters,
    ).fetchall()
    counts = {row["mode"]: int(row["count"]) for row in rows}
    resource_key = _fingerprint("scope", {"sourceVersion": source_version, "scope": scope})
    return {
        "kind": "fareScopeManifest",
        "resourceKey": resource_key,
        "source": {"kind": "search", "descriptorId": resource_key, "sourceVersion": source_version},
        "coverage": scope,
        "totalAvailable": sum(counts.values()),
        "availableModes": [mode for mode in MODES if counts.get(mode, 0) > 0],
        "complete": True,
    }


def _cursor_hash(scope: dict[str, object], projection: dict[str, object]) -> str:
    definition = {key: value for key, value in projection.items() if key != "after"}
    return _fingerprint("cursor-input", {"scope": scope, "projection": definition})


def _encode_cursor(source_version: str, input_hash: str, values: list[object]) -> str:
    payload = {"version": 1, "sourceVersion": source_version, "inputHash": input_hash, "values": values}
    payload["checksum"] = hashlib.sha256(("omio-cursor-v1:" + _canonical(payload)).encode()).hexdigest()[:24]
    return base64.urlsafe_b64encode(_canonical(payload).encode()).decode().rstrip("=")


def _decode_cursor(raw: str, source_version: str, input_hash: str, sort_field: str) -> list[object]:
    try:
        padding = "=" * (-len(raw) % 4)
        decoded = json.loads(base64.urlsafe_b64decode(raw + padding))
        if not isinstance(decoded, dict) or set(decoded) != {"version", "sourceVersion", "inputHash", "values", "checksum"}:
            raise ValueError
        checksum = decoded.pop("checksum")
        expected_checksum = hashlib.sha256(("omio-cursor-v1:" + _canonical(decoded)).encode()).hexdigest()[:24]
        if checksum != expected_checksum:
            raise ValueError
        expected_length = 3 if sort_field == "departureMinutes" else 4
        if decoded["version"] != 1 or not isinstance(decoded["values"], list) or len(decoded["values"]) != expected_length:
            raise ValueError
        if sort_field == "departureMinutes":
            service_date, departure_minutes, fare_id = decoded["values"]
            primary = departure_minutes
        else:
            primary, service_date, departure_minutes, fare_id = decoded["values"]
        if (
            isinstance(primary, bool)
            or not isinstance(primary, int)
            or primary < 0
            or not isinstance(service_date, str)
            or _date(service_date, "cursor.serviceDate").isoformat() != service_date
            or isinstance(departure_minutes, bool)
            or not isinstance(departure_minutes, int)
            or not 0 <= departure_minutes <= 1_439
            or isinstance(fare_id, bool)
            or not isinstance(fare_id, int)
            or fare_id < 1
        ):
            raise ValueError
    except QueryApiError:
        _fail("staleCursor", "The result cursor no longer matches this fare scope.", HTTPStatus.CONFLICT)
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError, binascii.Error):
        _fail("staleCursor", "The result cursor no longer matches this fare scope.", HTTPStatus.CONFLICT)
    if decoded["sourceVersion"] != source_version or decoded["inputHash"] != input_hash:
        _fail("staleCursor", "The result cursor no longer matches this fare scope.", HTTPStatus.CONFLICT)
    return decoded["values"]


def _cursor_predicate(components: list[tuple[str, str]], values: list[object]) -> tuple[str, list[object]]:
    columns = [column for column, _ in components]
    clauses: list[str] = []
    parameters: list[object] = []
    for index, (column, item_direction) in enumerate(components):
        prefix = " AND ".join(f"{columns[prefix_index]} = ?" for prefix_index in range(index))
        operator = ">" if item_direction == "asc" else "<"
        clause = f"{column} {operator} ?"
        if prefix:
            clause = f"({prefix} AND {clause})"
        clauses.append(clause)
        parameters.extend(values[:index])
        parameters.append(values[index])
    return "(" + " OR ".join(clauses) + ")", parameters


def _with_identity(projection: dict[str, object], scope: dict[str, object], payload: dict[str, object]) -> dict[str, object]:
    projection_input = {key: value for key, value in projection.items() if key != "projectionId"}
    input_hash = _stable_fingerprint("input", {"scope": scope, "projection": projection_input})
    result = {"projectionId": projection["projectionId"], "kind": projection["kind"], "inputHash": input_hash, **payload}
    result["resultFingerprint"] = _fingerprint("result", result)
    return result


def _fare_page(
    connection: sqlite3.Connection,
    scope: dict[str, object],
    projection: dict[str, object],
    source_version: str,
) -> dict[str, object]:
    filters = projection["filters"]
    assert isinstance(filters, dict)
    service_date = projection["serviceDate"]
    assert service_date is None or isinstance(service_date, str)
    where, parameters = _where(connection, scope, filters, service_date=service_date)
    total = int(connection.execute(
        f"""
        SELECT COUNT(*) FROM fares f
        JOIN routes r ON r.id = f.route_id
        JOIN locations origin ON origin.id = r.origin_location_id
        JOIN locations destination ON destination.id = r.destination_location_id
        WHERE {where}
        """,
        parameters,
    ).fetchone()[0])
    sort = projection["sort"]
    assert isinstance(sort, dict)
    primary = SORT_FIELDS[str(sort["field"])]
    direction = str(sort["direction"])
    if sort["field"] == "departureMinutes":
        components = [
            ("f.service_date", direction),
            (_minute_expression(), direction),
            ("f.id", "asc"),
        ]
        order_by = f"f.service_date {direction.upper()}, departure_minutes {direction.upper()}, f.id ASC"
    else:
        components = [
            (primary, direction),
            ("f.service_date", "asc"),
            (_minute_expression(), "asc"),
            ("f.id", "asc"),
        ]
        order_by = f"{primary} {direction.upper()}, f.service_date ASC, departure_minutes ASC, f.id ASC"
    query_where = where
    query_parameters = list(parameters)
    cursor_input_hash = _cursor_hash(scope, projection)
    if projection["after"] is not None:
        cursor_values = _decode_cursor(str(projection["after"]), source_version, cursor_input_hash, str(sort["field"]))
        cursor_where, cursor_parameters = _cursor_predicate(components, cursor_values)
        query_where += " AND " + cursor_where
        query_parameters.extend(cursor_parameters)
    limit = int(projection["limit"])
    rows = connection.execute(
        FARE_SELECT
        + f" WHERE {query_where} ORDER BY {order_by} LIMIT ?",
        (*query_parameters, limit + 1),
    ).fetchall()
    visible = rows[:limit]
    items = [_fare_item(row) for row in visible]
    has_next = len(rows) > limit
    next_cursor = None
    if has_next and visible:
        row = visible[-1]
        if sort["field"] == "departureMinutes":
            values = [row["service_date"], int(row["departure_minutes"]), int(row["id"])]
        else:
            values = [
                row[{"priceCents": "price_cents", "durationMinutes": "duration_minutes"}[str(sort["field"])]],
                row["service_date"],
                int(row["departure_minutes"]),
                int(row["id"]),
            ]
        next_cursor = _encode_cursor(source_version, cursor_input_hash, values)
    return _with_identity(
        projection,
        scope,
        {
            "items": items,
            "pageInfo": {"total": total, "returned": len(items), "hasNextPage": has_next, "nextCursor": next_cursor},
        },
    )


def _calendar_days(connection: sqlite3.Connection, scope: dict[str, object], projection: dict[str, object]) -> dict[str, object]:
    filters = projection["filters"]
    assert isinstance(filters, dict)
    where, parameters = _where(connection, scope, filters)
    objective = str(projection["objective"])
    primary = "f.price_cents" if objective == "cheapest" else "f.duration_minutes"
    rows = connection.execute(
        f"""
        WITH ranked AS (
            SELECT f.id, origin.slug AS origin_id, destination.slug AS destination_id,
                   f.service_date, r.mode, c.name AS carrier_name, f.price_cents,
                   f.duration_minutes, {_minute_expression()} AS departure_minutes,
                   f.available_seats,
                   COUNT(*) OVER (PARTITION BY f.service_date) AS day_count,
                   ROW_NUMBER() OVER (
                       PARTITION BY f.service_date
                       ORDER BY {primary} ASC, {_minute_expression()} ASC, f.id ASC
                   ) AS day_rank
            FROM fares f
            JOIN routes r ON r.id = f.route_id
            JOIN locations origin ON origin.id = r.origin_location_id
            JOIN locations destination ON destination.id = r.destination_location_id
            JOIN companies c ON c.id = f.company_id
            WHERE {where}
        )
        SELECT * FROM ranked WHERE day_rank = 1 ORDER BY service_date ASC
        """,
        parameters,
    ).fetchall()
    by_date = {row["service_date"]: row for row in rows}
    window = scope["dateWindow"]
    assert isinstance(window, dict)
    current = date.fromisoformat(str(window["from"]))
    end = date.fromisoformat(str(window["to"]))
    days: list[dict[str, object]] = []
    while current <= end:
        service_date = current.isoformat()
        row = by_date.get(service_date)
        days.append(
            {
                "date": service_date,
                "count": int(row["day_count"]) if row is not None else 0,
                "representative": _fare_item(row) if row is not None else None,
            }
        )
        current += timedelta(days=1)
    return _with_identity(projection, scope, {"days": days})


def _carrier_facets(connection: sqlite3.Connection, scope: dict[str, object], projection: dict[str, object]) -> dict[str, object]:
    filters = projection["filters"]
    assert isinstance(filters, dict)
    where, parameters = _where(connection, scope, filters, ignore_carriers=True)
    rows = connection.execute(
        f"""
        SELECT c.name AS carrier_name, COUNT(*) AS count
        FROM fares f
        JOIN routes r ON r.id = f.route_id
        JOIN locations origin ON origin.id = r.origin_location_id
        JOIN locations destination ON destination.id = r.destination_location_id
        JOIN companies c ON c.id = f.company_id
        WHERE {where}
        GROUP BY c.id, c.name
        ORDER BY count DESC, c.name ASC
        """,
        parameters,
    ).fetchall()
    options = [
        {"carrierId": f'carrier-{stable_ref(row["carrier_name"])}', "carrierName": row["carrier_name"], "count": int(row["count"])}
        for row in rows
    ]
    return _with_identity(projection, scope, {"options": options})


def _mode_summary(connection: sqlite3.Connection, scope: dict[str, object], projection: dict[str, object]) -> dict[str, object]:
    filters = projection["filters"]
    assert isinstance(filters, dict)
    baseline = str(projection["baseline"])
    where, parameters = _where(connection, scope, filters, ignore_modes=baseline == "withoutModeFilter")
    rows = connection.execute(
        f"""
        SELECT r.mode, COUNT(*) AS count, MIN(f.price_cents) AS min_price,
               MIN(f.duration_minutes) AS min_duration
        FROM fares f
        JOIN routes r ON r.id = f.route_id
        JOIN locations origin ON origin.id = r.origin_location_id
        JOIN locations destination ON destination.id = r.destination_location_id
        WHERE {where}
        GROUP BY r.mode
        """,
        parameters,
    ).fetchall()
    by_mode = {row["mode"]: row for row in rows}
    modes = [
        {
            "mode": mode,
            "count": int(by_mode[mode]["count"]),
            "minPriceCents": int(by_mode[mode]["min_price"]) if by_mode[mode]["min_price"] is not None else None,
            "minDurationMinutes": int(by_mode[mode]["min_duration"]) if by_mode[mode]["min_duration"] is not None else None,
        }
        for mode in MODES
        if mode in by_mode
    ]
    return _with_identity(projection, scope, {"baseline": baseline, "modes": modes})


def _highlight(connection: sqlite3.Connection, where: str, parameters: list[object], field: str) -> dict[str, object] | None:
    primary = "f.price_cents" if field == "cheapest" else "f.duration_minutes"
    row = connection.execute(
        FARE_SELECT + f" WHERE {where} ORDER BY {primary} ASC, f.service_date ASC, departure_minutes ASC, f.id ASC LIMIT 1",
        parameters,
    ).fetchone()
    return _fare_item(row) if row is not None else None


def _fare_highlights(connection: sqlite3.Connection, scope: dict[str, object], projection: dict[str, object]) -> dict[str, object]:
    filters = projection["filters"]
    assert isinstance(filters, dict)
    where, parameters = _where(connection, scope, filters)
    return _with_identity(
        projection,
        scope,
        {"cheapest": _highlight(connection, where, parameters, "cheapest"), "fastest": _highlight(connection, where, parameters, "fastest")},
    )


def execute_query_groups(connection: sqlite3.Connection, value: object, source_version: str) -> dict[str, object]:
    request = parse_query_groups_request(value)
    if request["expectedSourceVersion"] not in (None, source_version):
        _fail("sourceChanged", "The fare source changed. Refresh the displayed results.", HTTPStatus.CONFLICT)
    deadline = time.monotonic() + QUERY_TIMEOUT_SECONDS
    connection.set_progress_handler(lambda: int(time.monotonic() >= deadline), 10_000)
    try:
        connection.execute("BEGIN")
        metadata = {row["key"]: row["value"] for row in connection.execute("SELECT key, value FROM metadata")}
        groups: list[dict[str, object]] = []
        raw_groups = request["groups"]
        assert isinstance(raw_groups, list)
        for group in raw_groups:
            scope = group["scope"]
            assert isinstance(scope, dict)
            _scope_exists(connection, scope, metadata)
            manifest = _manifest(connection, scope, source_version)
            projections: list[dict[str, object]] = []
            for projection in group["projections"]:
                kind = projection["kind"]
                if kind == "farePage":
                    result = _fare_page(connection, scope, projection, source_version)
                elif kind == "calendarDays":
                    result = _calendar_days(connection, scope, projection)
                elif kind == "carrierFacets":
                    result = _carrier_facets(connection, scope, projection)
                elif kind == "modeSummary":
                    result = _mode_summary(connection, scope, projection)
                elif kind == "fareHighlights":
                    result = _fare_highlights(connection, scope, projection)
                else:
                    raise AssertionError(f"unhandled projection {kind}")
                projections.append(result)
            groups.append({"groupId": group["groupId"], "manifest": manifest, "projections": projections})
        connection.commit()
        return {"version": 1, "requestId": request["requestId"], "sourceVersion": source_version, "groups": groups}
    except sqlite3.OperationalError as error:
        connection.rollback()
        if "interrupted" in str(error).lower() or "locked" in str(error).lower():
            _fail("databaseUnavailable", "The fare database could not complete the request.", HTTPStatus.SERVICE_UNAVAILABLE)
        raise
    finally:
        connection.set_progress_handler(None, 0)


def execute_lookup(connection: sqlite3.Connection, value: object, source_version: str) -> dict[str, object]:
    request = parse_lookup_request(value)
    if request["sourceVersion"] != source_version:
        _fail("sourceChanged", "The fare source changed. Refresh the displayed results.", HTTPStatus.CONFLICT)
    pins = request["pins"]
    assert isinstance(pins, list)
    integer_ids: list[int] = []
    valid_pin_ids: dict[str, int] = {}
    for pin in pins:
        fare_id = pin["fareId"]
        if fare_id.startswith("fare_") and fare_id[5:].isdigit():
            integer_id = int(fare_id[5:])
            integer_ids.append(integer_id)
            valid_pin_ids[fare_id] = integer_id
    by_id: dict[int, dict[str, object]] = {}
    deadline = time.monotonic() + QUERY_TIMEOUT_SECONDS
    connection.set_progress_handler(lambda: int(time.monotonic() >= deadline), 10_000)
    try:
        connection.execute("BEGIN")
        if integer_ids:
            rows = connection.execute(
                FARE_SELECT + f" WHERE f.id IN ({','.join('?' for _ in integer_ids)})",
                integer_ids,
            ).fetchall()
            by_id = {int(row["id"]): _fare_item(row) for row in rows}
        connection.commit()
    except sqlite3.OperationalError as error:
        connection.rollback()
        if "interrupted" in str(error).lower() or "locked" in str(error).lower():
            _fail("databaseUnavailable", "The fare database could not complete the request.", HTTPStatus.SERVICE_UNAVAILABLE)
        raise
    finally:
        connection.set_progress_handler(None, 0)
    items: list[dict[str, object]] = []
    emitted: set[str] = set()
    missing: list[dict[str, str]] = []
    for pin in pins:
        fare_id = pin["fareId"]
        item = by_id.get(valid_pin_ids.get(fare_id, -1))
        if item is None:
            missing.append(pin)
        elif fare_id not in emitted:
            emitted.add(fare_id)
            items.append(item)
    return {
        "version": 1,
        "requestId": request["requestId"],
        "sourceVersion": source_version,
        "items": items,
        "missingPins": missing,
    }
