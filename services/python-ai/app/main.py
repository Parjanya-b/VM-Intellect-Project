import time

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from . import __version__
from .agents.registry import AGENTS
from .config import Settings, get_settings
from .errors import ServiceError
from .schemas import RunRequest, RunResponse
from .security import require_service_token

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


@app.post(
    "/v1/agents/{name}/run",
    response_model=RunResponse,
    dependencies=[Depends(require_service_token)],
)
def run_agent(
    name: str, request: RunRequest, settings: Settings = Depends(get_settings)
) -> RunResponse:
    agent = AGENTS.get(name)
    if agent is None:
        raise ServiceError(404, "UNKNOWN_AGENT", f"Unknown agent '{name}'.")
    started = time.perf_counter()
    result = agent.run(request, settings)
    return RunResponse(
        run_id=request.run_id,
        agent=name,
        status=result.status,
        output=result.output,
        warnings=result.warnings,
        model_version=agent.version,
        duration_ms=int((time.perf_counter() - started) * 1000),
    )
