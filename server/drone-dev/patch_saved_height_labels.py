"""Change two stale literal labels in the deployed UI without replacing its design.

Keep original assets. Create content-versioned copies and update only import
references/index/manifest. Reverse substitution must reproduce every old byte.
"""
from pathlib import Path
import hashlib,json,shutil,sys
ROOT=Path('/home/se/sandboxes/drone-dev');WEB=ROOT/'web';STAGE=ROOT/'height-final-20261023/labels'
def sha(b):return hashlib.sha256(b).hexdigest()
def save(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8');p.chmod(0o644)
if len(sys.argv)>1 and sys.argv[1]=='apply':
 m=json.loads((STAGE/'changes.json').read_text());backup=STAGE/'before';backup.mkdir(exist_ok=True)
 for name,v in m['roots'].items():assert sha((ROOT/name).read_bytes())==v['beforeSha256']
 for old,v in m['assets'].items():
  assert sha((WEB/'assets'/old).read_bytes())==v['beforeSha256']
  assert sha((STAGE/v['new']).read_bytes())==v['afterSha256']
 for old,v in m['assets'].items():shutil.copy2(STAGE/v['new'],WEB/'assets'/v['new'])
 for name,v in m['roots'].items():
  dest=backup/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,dest)
  temp=(ROOT/name).with_suffix('.height-label-tmp');shutil.copy2(STAGE/name,temp);temp.replace(ROOT/name)
 print(json.dumps(dict(status='APPLIED_LABELS_ONLY',assets=len(m['assets']),roots=list(m['roots']))));sys.exit()
original={p.name:p.read_text(encoding='utf-8') for p in (WEB/'assets').glob('*.js')}
direct={n for n,s in original.items() if '층수 × 3m' in s or '층 × 3m' in s}
affected=set(direct)
while True:
 more={n for n,s in original.items() if any(k in s for k in affected)}-affected
 if not more:break
 affected|=more
mapping={};contents={};pending=set(affected)
while pending:
 ready=[n for n in pending if not any(k in original[n] for k in pending)]
 if not ready:raise ValueError('Cyclic dependency; cannot safely rewrite saved assets')
 for n in ready:
  s=original[n].replace('층수 × 3m','층수 × 4m').replace('층 × 3m','층 × 4m')
  for old,new in mapping.items():s=s.replace(old,new)
  new=n[:-3]+'-height4-'+sha(s.encode())[:10]+'.js';mapping[n]=new;contents[new]=s;pending.remove(n)
assets={}
for old,new in mapping.items():
 s=contents[new];restored=s
 for before,after in mapping.items():restored=restored.replace(after,before)
 assert restored==original[old].replace('층수 × 3m','층수 × 4m').replace('층 × 3m','층 × 4m')
 save(STAGE/new,s);assets[old]=dict(new=new,beforeSha256=sha(original[old].encode()),afterSha256=sha(s.encode()))
roots={}
for path in [WEB/'index.html',WEB/'.vite/manifest.json',ROOT/'web-allowlist.json']:
 text=path.read_text();new=text
 for old,replacement in mapping.items():new=new.replace(old,replacement)
 if path.name=='web-allowlist.json':
  values=json.loads(new)
  values+=['assets/'+n for n in contents if 'assets/'+n not in values]
  new=json.dumps(values)
 if new!=text:
  name=path.relative_to(ROOT).as_posix();roots[name]=dict(beforeSha256=sha(text.encode()),afterSha256=sha(new.encode()));save(STAGE/name,new)
save(STAGE/'changes.json',json.dumps(dict(assets=assets,roots=roots,literalsOnly=True),indent=2))
print(json.dumps(dict(status='PREPARED',direct=len(direct),assets=len(assets),roots=list(roots))))
