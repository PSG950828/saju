"""Root-level entrypoint for deployments that start Uvicorn from repo root.

This module delegates to the FastAPI app defined in `backend/app/main.py`.

Run examples:
- uvicorn backend_main:app --host 0.0.0.0 --port 8000
"""

from backend.app.main import app

__all__ = ["app"]
