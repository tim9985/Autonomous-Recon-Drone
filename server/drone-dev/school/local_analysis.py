"""Use the local analysis implementation against immutable exported inputs."""
import json
from functools import lru_cache
from pathlib import Path
from .local_tools.search_regions import RegionRequest
from .local_tools.semantic_planning import SemanticStore,PriorityRequest

DATA=Path(__file__).parent/'local_tools/data'
@lru_cache(maxsize=8)
def read(name):return json.loads((DATA/name).read_bytes())

class ReadOnlySemantics(SemanticStore):
    def database(self):raise RuntimeError('School map analysis cannot open a database')
    def bindings(self,catalog,regions):
        for size in (2000,10000,40000):
            if regions['metadata']['partitionVersion']==read(f'regions-{size}.json')['metadata']['partitionVersion']:
                return read(f'bindings-{size}.json')
        raise ValueError('Unknown partition version')

def analyze(name,request,environment,world):
    catalog=read('semantics.json')
    if (environment,world)!=(catalog['environmentId'],catalog['worldVersion']):raise ValueError('Unknown world')
    if name=='semantics':return catalog
    model=PriorityRequest if name=='semantic-priority' else RegionRequest
    parsed=model.model_validate_json(request or '{}')
    if parsed.coordinates is not None:raise ValueError('Registered whole semantic regions must be selected')
    regions=read(f'regions-{parsed.maxAreaM2}.json')
    if name=='search-regions':return regions
    return ReadOnlySemantics(Path('/unused')).preview(catalog,regions,parsed,persist=False)
