from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from . import __version__
from .config import Settings, get_settings
from .errors import ServiceError

# No /docs, /redoc or /openapi.json: the docs pages load assets from a CDN (offline rule).
app = FastAPI(
    title="VM Intellect AI service",
    version=__version__,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.exception_handler(ServiceError)
async def service_error_handler(_: Request, exc: ServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code, content={"error": {"code": exc.code, "message": exc.message}}
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    fields = sorted({".".join(str(p) for p in e["loc"][1:]) for e in exc.errors()})
    return JSONResponse(
        status_code=422,
        content={
            "error": {"code": "VALIDATION_ERROR", "message": "Invalid request.", "fields": fields}
        },
    )


@app.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, object]:
    return {
        "status": "ok",
        "service": "vm-intellect-python-ai",
        "version": __version__,
        "tokenConfigured": bool(settings.service_token),
    }
