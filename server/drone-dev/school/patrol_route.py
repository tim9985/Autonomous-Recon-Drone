"""Bounded selected-area routes for the frozen Kumoh Unreal world; no coverage claims."""
import math

WORLD_VERSION = '990bee4527600963'
LAUNCH = (128.39159582279308, 36.145780912907234)
RADIUS = 6378137.0
BUILDING = {'name': '디지털관', 'profile': 'CAMPUS_BUILDING',
            'bounds_ned_m': [-48.074, 27.428, 56.184, 131.492],
            'roof_elevation_m': 95.2864, 'altitude_m': 45, 'speed_m_s': 3,
            'lane_spacing_m': 15}
ROAD_BLOCK = {'name':'캠퍼스 순환도로 블록', 'profile':'CAMPUS_ROAD_BLOCK',
              'vertices_ne_m': [[170,-15],[205,18],[180,300],[145,325],[-230,225],[-255,150],[-210,78],[-110,47]],
              'road_sources':['way/181210744','way/1353207300','way/1112181910','way/1353207301'],
              'boundary_status':'APPROXIMATE_ROAD_BLOCK_NOT_SURVEY',
              'altitude_m':60, 'speed_m_s':3, 'lane_spacing_m':100}


def offsets(longitude, latitude):
    return (math.radians(latitude - LAUNCH[1]) * RADIUS,
            math.radians(longitude - LAUNCH[0]) * RADIUS * math.cos(math.radians(LAUNCH[1])))


def position(north, east):
    return [LAUNCH[0] + math.degrees(east / (RADIUS * math.cos(math.radians(LAUNCH[1])))),
            LAUNCH[1] + math.degrees(north / RADIUS)]


def building_bounds():
    south, west, north, east = BUILDING['bounds_ned_m']
    a, b = position(south, west), position(north, east)
    return [a[0], a[1], b[0], b[1]]


def road_block():
    vertices = ROAD_BLOCK['vertices_ne_m']
    ns, es = zip(*vertices)
    a, b = position(min(ns),min(es)), position(max(ns),max(es))
    area = abs(sum(p[0]*q[1]-q[0]*p[1] for p,q in zip(vertices,vertices[1:]+vertices[:1])))/2
    return ROAD_BLOCK | {'bounds':[a[0],a[1],b[0],b[1]], 'area_m2':area,
                         'polygon':[position(*p) for p in vertices+vertices[:1]]}


def road_plan(bounds):
    if any(abs(a-b)>1e-10 for a,b in zip(bounds,road_block()['bounds'])):
        raise ValueError('ROAD_BLOCK_PRESET_REQUIRED')
    vertices = ROAD_BLOCK['vertices_ne_m']; low=min(p[0] for p in vertices); high=max(p[0] for p in vertices)
    rows=math.ceil((high-low)/ROAD_BLOCK['lane_spacing_m'])+1
    raw=[{'north_m':0.,'east_m':0.,'altitude_m':60.}]
    for row in range(rows):
        # Keep scan lines inside the polygon, including its narrow end points.
        n=low+(high-low)*(row+.001)/(rows-1+.002)
        intersections=[]
        for a,b in zip(vertices,vertices[1:]+vertices[:1]):
            if min(a[0],b[0])<=n<max(a[0],b[0]):
                intersections.append(a[1]+(n-a[0])*(b[1]-a[1])/(b[0]-a[0]))
        if len(intersections)!=2:raise ValueError('INVALID_ROAD_BLOCK')
        for e in sorted(intersections,reverse=bool(row%2)):
            raw.append({'north_m':n,'east_m':e,'altitude_m':60.})
    raw.append(raw[0].copy());points=[raw[0]]
    distance=0.
    for a,b in zip(raw,raw[1:]):
        leg=math.hypot(b['north_m']-a['north_m'],b['east_m']-a['east_m']);distance+=leg
        parts=max(1,math.ceil(leg/140))
        for part in range(1,parts+1):
            points.append({k:a[k]+(b[k]-a[k])*part/parts for k in a})
    if len(points)>64 or distance>2400:raise ValueError('PATROL_DURATION_TOO_LONG')
    return points


def plan(bounds, profile='LOCAL'):
    if len(bounds) != 4 or any(type(v) not in (int, float) or not math.isfinite(v) for v in bounds):
        raise ValueError('INVALID_PATROL_AREA')
    west, south, east, north = bounds
    if not west < east or not south < north:
        raise ValueError('INVALID_PATROL_AREA')
    if profile=='CAMPUS_ROAD_BLOCK':
        return road_plan(bounds)
    low_n, low_e = offsets(west, south)
    high_n, high_e = offsets(east, north)
    campus = profile == 'CAMPUS_BUILDING'
    if campus and any(abs(a-b) > 1e-10 for a,b in zip(bounds, building_bounds())):
        raise ValueError('BUILDING_PRESET_REQUIRED')
    if max(abs(low_n), abs(low_e), abs(high_n), abs(high_e)) > (150 if campus else 100):
        raise ValueError('PATROL_OUTSIDE_SIM_RANGE')
    if high_n - low_n < 1 or high_e - low_e < 1:
        raise ValueError('PATROL_AREA_TOO_SMALL')
    altitude, spacing = (45.0, 15) if campus else (15.0, 5)
    rows = math.ceil((high_n - low_n) / spacing) + 1
    if rows * 2 + 2 > 64:
        raise ValueError('PATROL_ROUTE_TOO_LONG')
    # Climb above the campus roof before any horizontal transit.
    points = [{'north_m': 0.0, 'east_m': 0.0, 'altitude_m': altitude}]
    for row in range(rows):
        n = low_n + (high_n - low_n) * row / (rows - 1)
        for e in ((low_e, high_e) if row % 2 == 0 else (high_e, low_e)):
            points.append({'north_m': n, 'east_m': e, 'altitude_m': altitude})
    points.append({'north_m': 0.0, 'east_m': 0.0, 'altitude_m': altitude})
    legs = [math.hypot(b['north_m'] - a['north_m'], b['east_m'] - a['east_m'])
            for a, b in zip([points[-1]] + points, points)]
    if max(legs) > 150 or sum(legs) > 2400:
        raise ValueError('PATROL_DURATION_TOO_LONG')
    return points
