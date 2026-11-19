"""CPU-only, reproducible search triage. Never declares identity or injury."""
from datetime import datetime
import math
import hashlib

VERSION = 'search-rules-1'
OPEN_REVIEW = {'PENDING', 'NEEDS_FIELD_CHECK', 'FIELD_CHECKING', 'DEFERRED'}


def review_summary(rows, reviews):
    ids = {str(row['observation_id']) for row in rows}
    counts = {key: 0 for key in ('PENDING', 'REVIEWED', 'DISMISSED', 'NEEDS_FIELD_CHECK', 'FIELD_CHECKING', 'FIELD_CONFIRMED', 'DEFERRED')}
    for oid in ids:
        state = reviews.get(oid, {}).get('status', 'PENDING')
        counts[state if state in counts else 'PENDING'] += 1
    return dict(total=len(ids), counts=counts, unresolved=sum(counts[s] for s in OPEN_REVIEW),
                field_open=counts['NEEDS_FIELD_CHECK']+counts['FIELD_CHECKING'], deferred=counts['DEFERRED'])

def epoch(value):
    try:
        n = float(value) if isinstance(value, (int, float)) else datetime.fromisoformat(str(value).replace('Z', '+00:00')).timestamp()
        return n if math.isfinite(n) else None
    except (ValueError, TypeError, OverflowError):
        return None

def distance(a, b):
    return 6371008.8 * math.hypot(math.radians(a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)), math.radians(a[1]-b[1]))

def center(geometry):
    rings = geometry['coordinates'] if geometry['type']=='Polygon' else geometry['coordinates'][0]
    points = rings[0][:-1] or rings[0]
    return [sum(p[i] for p in points)/len(points) for i in (0,1)]

def upper(row):
    value = (row.get('appearance') or {}).get('upper') or {}
    return (value.get('top') or [{}])[0].get('color') if value.get('status')=='OK' else None

def group_results(rows, overrides=None, reviews=None, wanted=None):
    groups = {}
    for row in rows:
        oid = str(row['observation_id'])
        key = (overrides or {}).get(oid) or ('candidate:'+str(row['candidate_id']) if row.get('candidate_id') else 'observation:'+oid)
        groups.setdefault(key, []).append(row)
    result = []
    for key, entries in groups.items():
        entries.sort(key=lambda r:(epoch(r.get('capture_at')) or 0,str(r['observation_id'])))
        # Only distinct, consecutive frames with sufficiently confident lying labels.
        chain=[];best=[];seen=set();previous_candidate=None
        for row in entries:
            frame=row.get('frame_id');t=epoch(row.get('capture_at'));pose=row.get('posture') or {}
            if frame in seen:continue
            seen.add(frame)
            probability=pose.get('confidence',(pose.get('p') or {}).get(str(pose.get('label','')).lower()))
            valid=frame is not None and t is not None and str(pose.get('label','')).upper() in ('LYING','LYING_DOWN','PRONE','SUPINE') and isinstance(probability,(int,float)) and math.isfinite(probability) and .6<=probability<=1
            if not valid:chain=[];continue
            if chain and (not 0<t-chain[-1][0]<=3 or row.get('candidate_id')!=previous_candidate):chain=[]
            previous_candidate=row.get('candidate_id')
            chain.append((t,str(row['observation_id'])))
            if len(chain)>=3 and chain[-1][0]-chain[0][0]>=2 and len(chain)>len(best):best=chain[:]
        lying=[r for r in entries if str((r.get('posture') or {}).get('label','')).upper() in ('LYING','LYING_DOWN','PRONE','SUPINE')]
        level='REPEATED_LYING' if best else 'POSTURE_REVIEW' if lying else 'NORMAL'
        evidence=[o for _,o in best] if best else [str(r['observation_id']) for r in lying]
        pending=[o for o in evidence if (reviews or {}).get(o,{}).get('status','PENDING') in OPEN_REVIEW]
        pending += [str(r['observation_id']) for r in entries if (reviews or {}).get(str(r['observation_id']),{}).get('status') in ('NEEDS_FIELD_CHECK','FIELD_CHECKING','DEFERRED')]
        matching=[str(r['observation_id']) for r in entries if wanted and upper(r)==wanted]
        result.append(dict(id=key,display_id=hashlib.sha256(key.encode()).hexdigest()[:6].upper(),observations=entries,count=len(entries),first_at=entries[0].get('capture_at'),last_at=entries[-1].get('capture_at'),
            urgency=level,urgent_pending=bool(pending),evidence_ids=evidence,match_ids=matching,
            condition='MATCH' if matching else 'DIFFERENT' if wanted and any(upper(r) for r in entries) else 'UNKNOWN',
            reviewed=sum((reviews or {}).get(str(r['observation_id']),{}).get('status','PENDING')!='PENDING' for r in entries),
            identity='UNCONFIRMED',basis='MANUAL_GROUP' if key.startswith('manual:') else 'SOURCE_CANDIDATE_ID'))
    result.sort(key=lambda g:(not g['urgent_pending'],g['urgency']!='REPEATED_LYING',not bool(g['match_ids']),g['id']))
    return result

def recommend(regions, case, coverage, now):
    seen=case.get('last_seen');point=seen.get('point') if seen else None
    elapsed=max(0,now-(epoch(seen.get('at')) or now)) if seen else 0
    radius=max(100,elapsed*case.get('speed_mps',1.2))
    by_id={r['region_id']:r for r in coverage.get('regions',[])}
    times={}
    for f in coverage.get('features',[]):
        p=f['properties'];t=epoch(p.get('observed_at'))
        if t is not None:times.setdefault(p['region_id'],[]).append(t)
    result=[]
    for r in regions:
        cov=by_id.get(r['id'],{});fraction=min(1,max(0,cov.get('actual_percent',0)/100))
        stamps=times.get(r['id'],[]);oldest=min(stamps) if stamps else None
        age=max(0,now-oldest) if oldest is not None else None
        stale=age is not None and age>=case.get('revisit_minutes',30)*60
        d=distance(point,center(r['geometry'])) if point else None
        near=1/(1+d/radius) if d is not None else 0
        parts=dict(proximity=round(40*near,1),unobserved=round(40*(1-fraction),1),age=20 if stale else 0)
        reasons=[f"미관측 {round(100*(1-fraction))}%" if cov else '관측 기록 없음']
        if d is not None:reasons.insert(0,f'목격 지점↔구역 중심 {round(d)}m')
        if stale:reasons.append(f'관측 {int(age/60)}분 경과')
        result.append(dict(region_id=r['id'],name=r['name'],score=round(sum(parts.values()),1),components=parts,
            distance_m=round(d,1) if d is not None else None,observed_percent=round(fraction*100,1),oldest_observed_at=oldest,
            revisit=stale or fraction<.95,reasons=reasons,geometry=r['geometry']))
    result.sort(key=lambda r:(-r['score'],r['region_id']))
    return dict(version=VERSION,generated_at=now,case_revision=case['revision'],distance_method='STRAIGHT_LINE_ESTIMATE',
        assumed_speed_mps=case.get('speed_mps',1.2),elapsed_seconds=elapsed,assumed_range_m=round(radius),regions=result)
