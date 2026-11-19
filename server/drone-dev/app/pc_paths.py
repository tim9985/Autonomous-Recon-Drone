"""Per-operator filesystem scopes for remote SIM workspaces."""
from contextvars import ContextVar
from pathlib import Path, PurePosixPath
from uuid import UUID
import os

OWNER = ContextVar('school_pc_owner', default=None)


def bind(owner):
    OWNER.set(str(UUID(str(owner))))


def workspace():
    owner = OWNER.get()
    if owner is None: raise RuntimeError('Authenticated PC workspace required')
    return Path(os.environ.get('SCHOOL_PC_ROOT', '/data/pc-workspaces')) / owner


class ScopedPath:
    def __init__(self, kind): self.kind = kind
    def path(self): return workspace() / self.kind
    def __truediv__(self, child): return self.path() / child
    def __fspath__(self): return str(self.path())
    def __str__(self): return str(self.path())
    def __getattr__(self, name): return getattr(self.path(), name)


def bounded_path(root, name):
    part = PurePosixPath(name)
    if not name or '\\' in name or ':' in name or part.is_absolute() or any(x in ('..', '.') for x in part.parts):
        raise ValueError('Invalid workspace path')
    path = root.joinpath(*part.parts)
    if not path.resolve().is_relative_to(root.resolve()) or any(p.is_symlink() for p in [path, *path.parents] if p != root.parent):
        raise ValueError('Workspace path escapes root')
    return path


INPUT_DIRS = {'requests','plan-requests','cancel','commands','connection-requests','connection-stop',
              'scene-requests','search-requests','real-map-tiles/requests'}
SEED_DIRS = {'plans','states','connection-states'}
INPUT_FILES = {'active.json','connection-active.json'}
OUTPUT_DIRS = {'plans','states','connection-states','operator-status','tracks','search-responses',
               'real-map-tiles/results','runner-failures'}
OUTPUT_FILES = {'heartbeat.json','regional-readiness.json','map-binding.json','scene-status.json'}


def allowed_control(name, *, upload=False):
    path = PurePosixPath(name)
    if path.suffix != '.json': return False
    if upload and len(path.parts)==3 and path.parts[0]=='command-results':
        try:UUID(path.parts[1]);UUID(path.stem);return True
        except ValueError:return False
    folder = path.parent.as_posix()
    return name in (OUTPUT_FILES if upload else INPUT_FILES) or folder in (OUTPUT_DIRS if upload else INPUT_DIRS | SEED_DIRS)


def allowed_run(name):
    path = PurePosixPath(name)
    try: UUID(path.parts[0])
    except (ValueError, IndexError): return False
    if len(path.parts)==2 and path.name in {'session.json','archive.json','live-vision.json','flight-summary.json'}: return True
    if len(path.parts)>=4 and path.parts[1]=='observers' and path.suffix=='.json':
        return path.name in {'request.json','observation.json'} or (len(path.parts)==5 and path.parts[3]=='completions' and path.stem.isdigit())
    return False
