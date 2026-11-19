"""Per-job camera geometry; legacy jobs retain their original calibration."""
from contextlib import contextmanager
import os


@contextmanager
def geometry(worker,job):
    if str(job.get('coordinate_config_id'))!=os.environ.get('SCHOOL_COORDINATE_CONFIG_ID'):
        yield
        return
    from app.vision_core.geo import CameraModel
    from app.vision_core.pose import PoseGeo,GeoTiffDem
    if not hasattr(worker,'_school_pgeo'):
        worker._school_pgeo=PoseGeo(CameraModel(hfov_deg=78),environment='SIM',dem=GeoTiffDem(os.environ['SCHOOL_SIM_DEM_FILE']))
    prior,claims=worker.pgeo,worker.geo_claims
    try:
        worker.pgeo=worker._school_pgeo;worker.geo_claims=True
        yield
    finally:worker.pgeo=prior;worker.geo_claims=claims
