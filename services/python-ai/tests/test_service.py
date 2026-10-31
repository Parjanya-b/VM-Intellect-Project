from uuid import uuid4

import pytest

from app.config import get_settings
from app.schemas import AGENT_NAMES
from app.storage import resolve_upload

from .conftest import HEADERS


def payload(files=None, **extra):
    return {
        "runId": str(uuid4()),
        "jobId": str(uuid4()),
        "input": {},
        "files": files or [],
        **extra,
    }


def file_ref(file_id):
    return {"id": str(file_id), "format": "pdf", "kind": "pdf", "originalName": "a.pdf"}


def test_health_needs_no_token_and_hides_secrets(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["tokenConfigured"] is True
    assert "test-token" not in res.text


def test_docs_are_disabled(client):
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_run_requires_the_service_token(client):
    assert client.post("/v1/agents/drawing/run", json=payload()).status_code == 401
    bad = client.post("/v1/agents/drawing/run", json=payload(), headers={"X-Service-Token": "nope"})
    assert bad.status_code == 401
    assert bad.json()["error"]["code"] == "INVALID_SERVICE_TOKEN"


def test_fails_closed_when_no_token_is_configured(client, monkeypatch):
    monkeypatch.setenv("VMI_SERVICE_TOKEN", "")
    get_settings.cache_clear()
    res = client.post("/v1/agents/drawing/run", json=payload(), headers=HEADERS)
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "SERVICE_TOKEN_NOT_CONFIGURED"


@pytest.mark.parametrize("agent", AGENT_NAMES)
def test_every_agent_answers_with_an_honest_stub(client, agent):
    res = client.post(f"/v1/agents/{agent}/run", json=payload(), headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["agent"] == agent
    assert data["status"] == "completed"
    assert data["output"]["stub"] is True
    assert data["modelVersion"] == "stub-0.1"
    assert "Stub agent" in data["warnings"][0]
    assert isinstance(data["durationMs"], int)


def test_unknown_agent_is_404(client):
    res = client.post("/v1/agents/hacker/run", json=payload(), headers=HEADERS)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "UNKNOWN_AGENT"


def test_invalid_body_is_422_with_field_names(client):
    res = client.post("/v1/agents/drawing/run", json={"runId": "not-a-uuid"}, headers=HEADERS)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "runId" in res.json()["error"]["fields"]


def test_path_tricks_in_file_ids_are_rejected(client):
    bad = {"id": "../../etc/passwd", "format": "pdf", "kind": "pdf", "originalName": "x.pdf"}
    res = client.post("/v1/agents/drawing/run", json=payload([bad]), headers=HEADERS)
    assert res.status_code == 422


def test_stub_sees_uploaded_files_in_the_shared_data_folder(client, tmp_path):
    real, missing = uuid4(), uuid4()
    (tmp_path / "uploads").mkdir()
    (tmp_path / "uploads" / str(real)).write_bytes(b"%PDF-1.4")

    res = client.post(
        "/v1/agents/drawing/run", json=payload([file_ref(real), file_ref(missing)]), headers=HEADERS
    )
    out = res.json()["output"]
    assert out["fileCount"] == 2
    assert out["filesOnDisk"] == 1


def test_resolve_upload_stays_inside_uploads(tmp_path, monkeypatch):
    monkeypatch.setenv("VMI_DATA_DIR", str(tmp_path))
    get_settings.cache_clear()
    uid = uuid4()
    path = resolve_upload(get_settings(), uid)
    assert path == (tmp_path / "uploads" / str(uid)).resolve()
