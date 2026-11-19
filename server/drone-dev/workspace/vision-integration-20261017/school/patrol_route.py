"""Bounded selected-area routes for the frozen Kumoh Unreal world; no coverage claims."""
import math

WORLD_VERSION = '990bee4527600963'
LAUNCH = (128.39159582279308, 36.145780912907234)
RADIUS = 6378137.0


def offsets(longitude, latitude):
    return (math.radians(latitude - LAUNCH[1]) * RADIUS,
            math.radians(longitude - LAUNCH[0]) * RADIUS * math.cos(math.radians(LAUNCH[1])))


def position(north, east):
    return [LAUNCH[0] + math.degrees(east / (RADIUS * math.cos(math.radians(LAUNCH[1])))),
            LAUNCH[1] + math.degrees(north / RADIUS)]


def plan(bounds):
    if len(bounds) != 4 or any(type(v) not in (int, float) or not math.isfinite(v) for v in bounds):
        raise ValueError('INVALID_PATROL_AREA')
    west, south, east, north = bounds
    if not west < east or not south < north:
        raise ValueError('INVALID_PATROL_AREA')
    low_n, low_e = offsets(west, south)
    high_n, high_e = offsets(east, north)
    if max(abs(low_n), abs(low_e), abs(high_n), abs(high_e)) > 100:
        raise ValueError('PATROL_OUTSIDE_SIM_RANGE')
    if high_n - low_n < 1 or high_e - low_e < 1:
        raise ValueError('PATROL_AREA_TOO_SMALL')
    rows = math.ceil((high_n - low_n) / 5) + 1
    if rows * 2 + 1 > 64:
        raise ValueError('PATROL_ROUTE_TOO_LONG')
    points = []
    for row in range(rows):
        n = low_n + (high_n - low_n) * row / (rows - 1)
        for e in ((low_e, high_e) if row % 2 == 0 else (high_e, low_e)):
            points.append({'north_m': n, 'east_m': e, 'altitude_m': 15.0})
    points.append({'north_m': 0.0, 'east_m': 0.0, 'altitude_m': 15.0})
    legs = [math.hypot(b['north_m'] - a['north_m'], b['east_m'] - a['east_m'])
            for a, b in zip([points[-1]] + points, points)]
    if max(legs) > 150 or sum(legs) > 2400:
        raise ValueError('PATROL_DURATION_TOO_LONG')
    return points
