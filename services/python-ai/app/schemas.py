from typing import Any, Literal, get_args
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

AgentName = Literal[
    "understanding", "drawing", "selection", "planning",
    "cam", "simulation", "optimization", "reporting",
]  # fmt: skip
AGENT_NAMES: tuple[str, ...] = get_args(AgentName)


class CamelModel(BaseModel):
    """JSON uses camelCase (like the Node API); Python code uses snake_case."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class FileRef(CamelModel):
    id: UUID  # a real UUID type: path tricks like "../x" are rejected at the door
    format: str = Field(max_length=10)
    kind: Literal["pdf", "image", "spreadsheet", "cad"]
    original_name: str = Field(max_length=200)


class RunRequest(CamelModel):
    run_id: UUID
    job_id: UUID
    trace_id: str | None = Field(default=None, max_length=64)
    input: dict[str, Any] = Field(default_factory=dict)
    files: list[FileRef] = Field(default_factory=list, max_length=50)


class RunResponse(CamelModel):
    run_id: UUID
    agent: str
    status: Literal["completed", "needs_review", "failed"]
    output: dict[str, Any]
    warnings: list[str]
    model_version: str
    duration_ms: int
