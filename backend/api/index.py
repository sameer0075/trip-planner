"""Vercel serverless entry point: the Python runtime serves the WSGI callable named `app`."""

import sys
from pathlib import Path

# Vercel runs this file from api/; make the Django project root importable.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config.wsgi import application as app

__all__ = ["app"]
