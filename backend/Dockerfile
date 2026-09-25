# syntax=docker/dockerfile:1

# ---- base: runtime dependencies only --------------------------------------------------------
FROM python:3.14-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
RUN useradd --create-home --uid 1000 app && chown app:app /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# ---- test: lint + test suite (docker compose run --rm backend-tests) ------------------------
FROM base AS test

COPY requirements-dev.txt .
RUN pip install -r requirements-dev.txt
COPY --chown=app:app . .
USER app
CMD ["sh", "-c", "ruff check . && ruff format --check . && pytest"]

# ---- runtime: the production image ----------------------------------------------------------
FROM base AS runtime

COPY --chown=app:app . .
USER app
EXPOSE 8000
# gunicorn.conf.py reads PORT, WEB_CONCURRENCY and GUNICORN_THREADS from the environment.
CMD ["gunicorn", "config.wsgi:application"]
