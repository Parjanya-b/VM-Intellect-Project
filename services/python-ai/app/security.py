import secrets

from fastapi import Depends, Header

from .config import Settings, get_settings
from .errors import ServiceError


def require_service_token(
    x_service_token: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    expected = settings.service_token
    if not expected:  # fail closed: no token configured means nobody gets in
        raise ServiceError(
            503, "SERVICE_TOKEN_NOT_CONFIGURED", "The service token is not configured."
        )
    if x_service_token is None or not secrets.compare_digest(
        x_service_token.encode(), expected.encode()
    ):
        raise ServiceError(401, "INVALID_SERVICE_TOKEN", "Missing or invalid service token.")
