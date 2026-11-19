"""Keep original integration routes intact while adding the business application."""
from app.backend import app
from .main import app as business

app.include_router(business.router)
app.exception_handlers.update(business.exception_handlers)
for middleware in business.user_middleware:
    app.add_middleware(middleware.cls,**middleware.kwargs)

app.title='Drone backend · business and isolated integration'
app.version=business.version
app.openapi_schema=None
app.openapi=business.openapi
