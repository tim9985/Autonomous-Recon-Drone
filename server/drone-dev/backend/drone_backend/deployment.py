"""Keep original integration routes intact while adding the business application."""
from app.backend import app
from .main import app as business
from app.simulation_api import router as simulation
from app.postflight_api import router as postflight
from app.local_patrol_api import router as local_patrol
from app.local_mission_api import router as local_mission
from app.communication_api import router as communication
business.include_router(simulation)
business.include_router(postflight)
business.include_router(local_patrol)
business.include_router(local_mission)
from app.pc_sync import router as pc_sync
business.include_router(pc_sync)
from app.pc_recording import router as pc_recording
business.include_router(pc_recording)
business.include_router(communication)
from app.local_records import router as local_records
business.include_router(local_records)

app.include_router(business.router)
app.exception_handlers.update(business.exception_handlers)
for middleware in business.user_middleware:
    app.add_middleware(middleware.cls,**middleware.kwargs)

app.title='Drone backend · business and isolated integration'
app.version=business.version
app.openapi_schema=None
app.openapi=business.openapi
from app.communication import CommunicationTrace
app.add_middleware(CommunicationTrace,service='backend')
from app.local_sessions import install as install_local_sessions
install_local_sessions(app)
