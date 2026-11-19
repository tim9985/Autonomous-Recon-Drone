"""Create an isolated mission tree; no retention/deletion policy is enabled."""
import argparse
import re
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument('mission_id')
parser.add_argument('--root', default='/data/missions')
args = parser.parse_args()
if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}', args.mission_id):
    parser.error('mission_id must be 1-64 safe characters')
for folder in ('video', 'metadata', 'crops', 'results', 'logs'):
    (Path(args.root) / args.mission_id / folder).mkdir(parents=True, exist_ok=True)
print(str(Path(args.root) / args.mission_id))
