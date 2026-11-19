"""Durable REAL command outbox. No SIM commands, no reconnect replay."""
from contextlib import contextmanager
import hashlib
import json
from pathlib import Path
import sqlite3
import time
from uuid import uuid4

CHECKS = ('observer_ready', 'battery_endurance', 'terrain_clearance', 'camera_ready',
          'person_pixel_altitude', 'return_path', 'rc_backup_ready')
MODES = (0, 2, 4, 5, 6, 9)
TERMINAL = ('SUCCEEDED', 'FAILED', 'UNKNOWN', 'EXPIRED', 'CANCELLED', 'LANDED', 'ABORTED')

class Refused(Exception):
    pass

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False)

def policy(action, payload, status):
    if not status.get('connected'): raise Refused('FC_DISCONNECTED_OR_STALE')
    if status.get('rc_override'): raise Refused('RC_TAKEOVER')
    if action in ('ARM', 'DISARM', 'UPLOAD', 'START') and status.get('landed') is not True:
        raise Refused('LANDED_STATE_REQUIRED')
    if action in ('ARM', 'UPLOAD', 'START') and status.get('armed') is not False:
        raise Refused('DISARMED_STATE_REQUIRED')
    if action in ('ARM', 'START'):
        for key in ('gps_ok', 'battery_ok', 'failsafe_ok'):
            if status.get(key) is not True: raise Refused(key.upper()+'_REQUIRED')
    if action == 'MODE' and payload.get('mode') not in MODES: raise Refused('MODE_NOT_ALLOWED')
    if action == 'START' and not all(payload.get('confirmations', {}).get(k) is True for k in CHECKS):
        raise Refused('PREFLIGHT_CONFIRMATIONS_REQUIRED')

class Store:
    def __init__(self, path, clock=time.time):
        self.path, self.clock = Path(path), clock
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.db() as c:
            c.executescript('''
            CREATE TABLE IF NOT EXISTS gateway(drone TEXT PRIMARY KEY, sid TEXT, seen REAL, body TEXT);
            CREATE TABLE IF NOT EXISTS lease(drone TEXT PRIMARY KEY, owner TEXT, sid TEXT, id TEXT, expires REAL);
            CREATE TABLE IF NOT EXISTS job(id TEXT PRIMARY KEY, drone TEXT, owner TEXT, sid TEXT,
              gateway TEXT, action TEXT, payload TEXT, hash TEXT, created REAL, expires REAL,
              deadline REAL, state TEXT, revision INTEGER DEFAULT 0, result TEXT DEFAULT '{}', lease_id TEXT);
            CREATE TABLE IF NOT EXISTS upload(drone TEXT PRIMARY KEY, gateway TEXT, hash TEXT, verified REAL);
            CREATE TABLE IF NOT EXISTS preflight(drone TEXT PRIMARY KEY, owner TEXT, sid TEXT, gateway TEXT, hash TEXT, checks TEXT, expires REAL);
            ''')
            if 'lease_id' not in {r[1] for r in c.execute('PRAGMA table_info(job)')}:
                c.execute('ALTER TABLE job ADD COLUMN lease_id TEXT')
        self.path.chmod(0o600)

    @contextmanager
    def db(self):
        with sqlite3.connect(self.path, timeout=5) as c:
            c.row_factory = sqlite3.Row
            c.execute('PRAGMA busy_timeout=5000')
            c.execute('BEGIN IMMEDIATE')
            yield c

    def clean(self, c):
        now = self.clock()
        c.execute("UPDATE job SET state='EXPIRED' WHERE state='QUEUED' AND expires<=?", (now,))
        c.execute("UPDATE job SET state='UNKNOWN' WHERE state IN ('DISPATCHED','RUNNING') AND deadline<=?", (now,))
        c.execute("UPDATE job SET state=CASE WHEN state='QUEUED' THEN 'CANCELLED' ELSE 'UNKNOWN' END WHERE state IN ('QUEUED','DISPATCHED','RUNNING') AND NOT EXISTS(SELECT 1 FROM lease l WHERE l.drone=job.drone AND l.id=job.lease_id AND l.expires>?)",(now,))

    def heartbeat(self, drone, sid, body):
        with self.db() as c:
            old = c.execute('SELECT * FROM gateway WHERE drone=?', (drone,)).fetchone()
            if old and old['sid'] != sid:
                c.execute("UPDATE job SET state=CASE WHEN state='QUEUED' THEN 'CANCELLED' ELSE 'UNKNOWN' END WHERE drone=? AND state IN ('QUEUED','DISPATCHED','RUNNING')", (drone,))
                c.execute('DELETE FROM upload WHERE drone=?', (drone,))
                c.execute('DELETE FROM preflight WHERE drone=?', (drone,))
            c.execute('INSERT OR REPLACE INTO gateway VALUES(?,?,?,?)', (drone, sid, self.clock(), canonical(body)))

    def gateway(self, c, drone):
        row = c.execute('SELECT * FROM gateway WHERE drone=?', (drone,)).fetchone()
        status = json.loads(row['body']) if row else {}
        if not row or self.clock()-row['seen'] > 4: status['connected'] = False
        return (row['sid'] if row else None), status

    def acquire(self, drone, owner, sid):
        with self.db() as c:
            old = c.execute('SELECT * FROM lease WHERE drone=?', (drone,)).fetchone()
            if old and old['expires'] > self.clock() and (old['owner'],old['sid']) != (owner,sid):
                raise Refused('CONTROL_HELD_BY_ANOTHER_SESSION')
            lid = old['id'] if old and (old['owner'],old['sid']) == (owner,sid) and old['expires'] > self.clock() else str(uuid4())
            c.execute('INSERT OR REPLACE INTO lease VALUES(?,?,?,?,?)', (drone,owner,sid,lid,self.clock()+8))
            return dict(c.execute('SELECT * FROM lease WHERE drone=?',(drone,)).fetchone()) | {'session_id':sid}

    def renew(self, drone, owner, sid):
        with self.db() as c:
            row = self.require_lease(c, drone, owner, sid)
            c.execute('UPDATE lease SET expires=? WHERE drone=?', (self.clock()+8,drone))
            return dict(row) | {'expires':self.clock()+8}

    def require_lease(self, c, drone, owner, sid):
        row = c.execute('SELECT * FROM lease WHERE drone=?', (drone,)).fetchone()
        if not row or row['expires'] <= self.clock() or (row['owner'],row['sid']) != (owner,sid):
            raise Refused('CONTROL_LEASE_EXPIRED')
        return row

    def lease(self, drone):
        with self.db() as c:
            row=c.execute('SELECT * FROM lease WHERE drone=?',(drone,)).fetchone()
            return dict(row) if row and row['expires']>self.clock() else None

    def release(self, drone, owner, sid):
        with self.db() as c:
            self.require_lease(c,drone,owner,sid)
            c.execute('DELETE FROM lease WHERE drone=?',(drone,))
            c.execute("UPDATE job SET state='CANCELLED' WHERE drone=? AND sid=? AND state='QUEUED'",(drone,sid))
            c.execute("UPDATE job SET state='UNKNOWN' WHERE drone=? AND sid=? AND state IN ('DISPATCHED','RUNNING')",(drone,sid))

    def revoke(self, drone):
        with self.db() as c:
            c.execute('DELETE FROM lease WHERE drone=?',(drone,))
            c.execute("UPDATE job SET state='CANCELLED' WHERE drone=? AND state='QUEUED'",(drone,))
            c.execute("UPDATE job SET state='UNKNOWN' WHERE drone=? AND state IN ('DISPATCHED','RUNNING')",(drone,))

    def attest(self, drone, owner, sid, plan_hash, checks):
        if set(checks)!=set(CHECKS) or not all(v is True for v in checks.values()):
            raise Refused('PREFLIGHT_CONFIRMATIONS_REQUIRED')
        with self.db() as c:
            lease=self.require_lease(c,drone,owner,sid)
            gateway,status=self.gateway(c,drone)
            if not status.get('connected'):raise Refused('FC_DISCONNECTED_OR_STALE')
            c.execute('INSERT OR REPLACE INTO preflight VALUES(?,?,?,?,?,?,?)',
                      (drone,owner,sid,gateway,plan_hash,canonical(checks),self.clock()+120))
        return {'recorded':True,'valid_seconds':120,'evidence_kind':'OPERATOR_ATTESTATION'}

    def preflight(self, drone, owner, sid, plan_hash):
        with self.db() as c:
            gateway,_=self.gateway(c,drone)
            row=c.execute('SELECT * FROM preflight WHERE drone=?',(drone,)).fetchone()
            if row and (row['owner'],row['sid'],row['gateway'],row['hash'])==(owner,sid,gateway,plan_hash) and row['expires']>self.clock():
                return json.loads(row['checks'])
        return {}

    def enqueue(self, jid, drone, owner, sid, action, payload):
        if action not in ('MODE','ARM','DISARM','RTL','LAND','UPLOAD','START'): raise Refused('ACTION_NOT_ALLOWED')
        meaning=hashlib.sha256(canonical([drone,owner,sid,action,payload]).encode()).hexdigest()
        with self.db() as c:
            self.clean(c)
            old=c.execute('SELECT * FROM job WHERE id=?',(jid,)).fetchone()
            if old:
                if old['hash']!=meaning: raise Refused('ID_CONFLICT')
                return self.view(old)
            lease=self.require_lease(c,drone,owner,sid)
            gateway,status=self.gateway(c,drone)
            if action=='START':
                upload=c.execute('SELECT * FROM upload WHERE drone=?',(drone,)).fetchone()
                if not upload or (upload['gateway'],upload['hash'])!=(gateway,payload.get('plan_hash')):
                    raise Refused('MISSION_READBACK_REQUIRED')
            policy(action,payload,status)
            active=c.execute("SELECT id FROM job WHERE drone=? AND state IN ('QUEUED','DISPATCHED','RUNNING')",(drone,)).fetchone()
            if active and action not in ('RTL','LAND'):raise Refused('COMMAND_IN_PROGRESS')
            if action in ('RTL','LAND'):
                c.execute("UPDATE job SET state=CASE WHEN state='QUEUED' THEN 'CANCELLED' ELSE 'ABORTED' END WHERE drone=? AND state IN ('QUEUED','DISPATCHED','RUNNING')",(drone,))
            now=self.clock()
            c.execute('INSERT INTO job(id,drone,owner,sid,gateway,action,payload,hash,created,expires,deadline,state,lease_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
                      (jid,drone,owner,sid,gateway,action,canonical(payload),meaning,now,now+8,now+60,'QUEUED',lease['id']))
            return self.view(c.execute('SELECT * FROM job WHERE id=?',(jid,)).fetchone())

    def poll(self, drone, gateway, accept_job=True, active_command_id=None):
        with self.db() as c:
            self.clean(c)
            actual,status=self.gateway(c,drone)
            if actual!=gateway:raise Refused('OLD_DEVICE_SESSION')
            lease=c.execute('SELECT * FROM lease WHERE drone=? AND expires>?',(drone,self.clock())).fetchone()
            active=c.execute('SELECT * FROM job WHERE id=? AND drone=?',(active_command_id,drone)).fetchone() if active_command_id else None
            cancelled=bool(active_command_id and (not active or not lease or active['state'] not in ('DISPATCHED','RUNNING') or active['lease_id']!=lease['id'] or active['gateway']!=gateway))
            result={'job':None,'lease_expires_at':lease['expires'] if lease else 0,
                    'lease_id':lease['id'] if lease else None,'lease_owner_session_id':lease['sid'] if lease else None,'cancel_active':cancelled}
            if not lease:
                c.execute("UPDATE job SET state='CANCELLED' WHERE drone=? AND state='QUEUED'",(drone,))
                return result
            if not accept_job:return result
            rows=c.execute("SELECT * FROM job WHERE drone=? AND state='QUEUED' ORDER BY created",(drone,)).fetchall()
            for row in rows:
                try:
                    if (row['gateway'],row['sid'],row['lease_id'])!=(gateway,lease['sid'],lease['id']):raise Refused('SESSION_CHANGED')
                    policy(row['action'],json.loads(row['payload']),status)
                except Refused as exc:
                    c.execute("UPDATE job SET state='CANCELLED',result=? WHERE id=?",(canonical({'error':str(exc)}),row['id']))
                    continue
                c.execute("UPDATE job SET state='DISPATCHED',deadline=? WHERE id=?",(self.clock()+60,row['id']))
                result['job']=self.view(c.execute('SELECT * FROM job WHERE id=?',(row['id'],)).fetchone())
                break
            return result

    def report(self, drone, gateway, jid, revision, state, evidence):
        with self.db() as c:
            row=c.execute('SELECT * FROM job WHERE id=?',(jid,)).fetchone()
            if not row or (row['drone'],row['gateway'])!=(drone,gateway):raise Refused('OLD_DEVICE_SESSION')
            if revision==row['revision']:
                if (state,canonical(evidence))!=(row['state'],row['result']):raise Refused('REPORT_CONFLICT')
                return self.view(row)
            if revision!=row['revision']+1 or row['state'] not in ('DISPATCHED','RUNNING'):
                raise Refused('REPORT_STATE_CONFLICT')
            if state not in ('SUCCEEDED','FAILED','UNKNOWN','RUNNING','LANDED','ABORTED'):raise Refused('REPORT_STATE_CONFLICT')
            payload=json.loads(row['payload'])
            if row['action']=='UPLOAD' and state=='SUCCEEDED':
                if not evidence.get('readback_verified') or evidence.get('plan_hash')!=payload['plan_hash']:
                    raise Refused('READBACK_REQUIRED')
                c.execute('INSERT OR REPLACE INTO upload VALUES(?,?,?,?)',(drone,gateway,payload['plan_hash'],self.clock()))
            deadline=self.clock()+(min(payload.get('estimated_seconds',900),900)+120 if state=='RUNNING' else 60)
            c.execute('UPDATE job SET state=?,revision=?,result=?,deadline=? WHERE id=?',(state,revision,canonical(evidence),deadline,jid))
            return self.view(c.execute('SELECT * FROM job WHERE id=?',(jid,)).fetchone())

    def get(self, jid):
        with self.db() as c:
            self.clean(c)
            row=c.execute('SELECT * FROM job WHERE id=?',(jid,)).fetchone()
            if not row:raise Refused('COMMAND_NOT_FOUND')
            return self.view(row)

    def status(self, drone):
        with self.db() as c:
            self.clean(c)
            gateway,status=self.gateway(c,drone)
            gw=c.execute('SELECT seen FROM gateway WHERE drone=?',(drone,)).fetchone()
            upload=c.execute('SELECT * FROM upload WHERE drone=?',(drone,)).fetchone()
            jobs=c.execute('SELECT * FROM job WHERE drone=? ORDER BY created DESC LIMIT 12',(drone,)).fetchall()
            return {'gateway_session_id':gateway,'status_received_at':gw['seen'] if gw else None,'fc':status,'upload':dict(upload) if upload else None,'commands':[self.view(r) for r in jobs]}

    @staticmethod
    def view(row):
        return {'command_id':row['id'],'drone_id':row['drone'],'owner_session_id':row['sid'],
                'gateway_session_id':row['gateway'],'action':row['action'],'payload':json.loads(row['payload']),
                'created_at':row['created'],'expires_at':row['expires'],'state':row['state'],
                'revision':row['revision'],'result':json.loads(row['result']),'environment':'REAL','auto_retry':False,'lease_id':row['lease_id']}
