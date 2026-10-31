from pathlib import Path
from uuid import UUID

from .config import Settings


def resolve_upload(settings: Settings, file_id: UUID) -> Path:
    """Path of an uploaded file. Built only from a UUID and checked to stay inside uploads/."""
    root = settings.uploads_dir.resolve()
    path = (root / str(file_id)).resolve()
    if not path.is_relative_to(root):
        raise ValueError("path escapes the uploads folder")
    return path
