from ..schemas import AGENT_NAMES
from .base import Agent
from .stub import StubAgent

AGENTS: dict[str, Agent] = {name: StubAgent(name) for name in AGENT_NAMES}
