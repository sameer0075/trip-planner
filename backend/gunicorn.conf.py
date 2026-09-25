"""Gunicorn settings, loaded automatically from the working directory."""

import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
# Trip planning waits on network I/O (routing, geocoding), so threads keep workers responsive.
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS", "4"))
timeout = 60
accesslog = "-"
