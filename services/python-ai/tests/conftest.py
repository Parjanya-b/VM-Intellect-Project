import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

TOKEN = "test-token-123"
HEADERS = {"X-Service-Token": TOKEN}


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Environment variables win over a developer's real .env file.
    monkeypatch.setenv("VMI_SERVICE_TOKEN", TOKEN)
    monkeypatch.setenv("VMI_DATA_DIR", str(tmp_path))
    get_settings.cache_clear()
    with TestClient(app) as c:
        yield c
    get_settings.cache_clear()
