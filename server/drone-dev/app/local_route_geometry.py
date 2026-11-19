"""Display-only 3D route; executable inputs and their hashes stay untouched."""
import math

DATUM='SIM_SOURCE_DEM'

def valid(point,size):
    return isinstance(point,(list,tuple)) and len(point)>=size and all(isinstance(v,(int,float)) and math.isfinite(v) for v in point[:size])

def feature(points,kind,region_id):
    return dict(type='Feature',properties=dict(kind=kind,region_id=region_id,altitude_datum=DATUM),geometry=dict(type='LineString',coordinates=points))

def project_route(value,execution=None,*,include_return=True,world_version=None):
    """Pair the existing exact horizontal projection with original NED heights.

    The legacy display route deduplicates equal XY points. Retain vertical
    segments by advancing that XY cursor only when north/east actually change.
    Never synthesize missing height or silently truncate mismatched geometry.
    """
    coordinates=value.get('route') or []
    if len(coordinates)<2 or not all(valid(p,2) for p in coordinates):return []
    rid=value['region_id']
    if value.get('kind')=='SHORT':
        short=value.get('binding',{}).get('short',{});origin=short.get('origin');height=short.get('altitude_m')
        if not valid(origin,3) or not isinstance(height,(int,float)) or not math.isfinite(height):return []
        return [feature([[*p[:2],origin[2]+height] for p in coordinates],'search',rid)]
    if not execution or not valid(execution.get('originGeographic'),2):return []
    absolute=valid(execution['originGeographic'],3)
    if not absolute and not world_version:return []
    groups=[('transit',execution.get('ingressPath',[]))]
    for leg in execution.get('legs',[]):
        groups.append(('search',[p for phase in leg['phases'] for p in (phase['start'],phase['end'])]))
    groups.append(('return',execution.get('returnPath',[])))
    origin=execution['originGeographic'];previous=None;cursor=-1;features=[]
    for kind,neds in groups:
        points=[]
        for ned in neds:
            if not valid(ned,3):return []
            horizontal=tuple(ned[:2])
            if horizontal!=previous:cursor+=1;previous=horizontal
            if cursor>=len(coordinates):return []
            point=[*coordinates[cursor][:2],(origin[2] if absolute else 0)-ned[2]]
            if not points or point!=points[-1]:points.append(point)
        if len(points)>1 and (include_return or kind!='return'):
            f=feature(points,kind,rid)
            if not absolute:f['properties'].update(altitude_datum='SIM_LAUNCH_RELATIVE',origin_geographic=origin[:2],world_version=world_version)
            features.append(f)
    return features if cursor==len(coordinates)-1 else []
