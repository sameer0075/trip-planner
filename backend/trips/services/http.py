"""A small JSON-over-HTTP client shared by the map service adapters."""

import logging
import threading
from collections.abc import Collection, Mapping
from typing import Any

import requests
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .errors import UpstreamServiceError

logger = logging.getLogger(__name__)

# requests.Session is not guaranteed thread-safe, and stops are reverse-geocoded concurrently.
_local = threading.local()

# Public map servers shed load with 429/503; a couple of quick retries ride out those blips.
_RETRY = Retry(
    total=2,
    backoff_factor=0.4,
    status_forcelist=(429, 502, 503, 504),
    allowed_methods=frozenset({"GET"}),
    raise_on_status=False,
)


def _session() -> requests.Session:
    session: requests.Session | None = getattr(_local, "session", None)
    if session is None:
        session = requests.Session()
        session.headers["User-Agent"] = settings.HTTP_USER_AGENT
        session.mount("https://", HTTPAdapter(max_retries=_RETRY))
        session.mount("http://", HTTPAdapter(max_retries=_RETRY))
        _local.session = session
    return session


def get_json(
    url: str,
    params: Mapping[str, Any] | None = None,
    *,
    accepted_error_statuses: Collection[int] = (),
) -> Any:
    """GET `url` and decode its JSON body.

    Error statuses listed in `accepted_error_statuses` are returned like successes, for services
    that describe domain failures (e.g. "no route") in a 4xx JSON body.
    """
    try:
        response = _session().get(url, params=params, timeout=settings.HTTP_TIMEOUT_SECONDS)
        if not response.ok and response.status_code not in accepted_error_statuses:
            response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Request to %s failed: %s", url, exc)
        raise UpstreamServiceError from exc
