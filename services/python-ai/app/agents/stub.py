from ..config import Settings
from ..schemas import RunRequest
from ..storage import resolve_upload
from .base import AgentResult


class StubAgent:
    """Placeholder agent. It does NO analysis; it only proves the plumbing works."""

    version = "stub-0.1"

    def __init__(self, name: str) -> None:
        self.name = name

    def run(self, request: RunRequest, settings: Settings) -> AgentResult:
        on_disk = sum(1 for f in request.files if resolve_upload(settings, f.id).is_file())
        return AgentResult(
            status="completed",
            output={
                "stub": True,
                "agent": self.name,
                "jobId": str(request.job_id),
                "fileCount": len(request.files),
                "filesOnDisk": on_disk,
                "fileKinds": sorted({f.kind for f in request.files}),
            },
            warnings=["Stub agent: no real analysis was performed. This output is a placeholder."],
        )
