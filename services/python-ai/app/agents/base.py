from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

from ..config import Settings
from ..schemas import RunRequest


@dataclass
class AgentResult:
    status: Literal["completed", "needs_review", "failed"]
    output: dict[str, Any]
    warnings: list[str] = field(default_factory=list)


class Agent(Protocol):
    name: str
    version: str

    def run(self, request: RunRequest, settings: Settings) -> AgentResult: ...
