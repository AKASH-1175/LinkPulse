import re
import secrets
import string
from urllib.parse import urlparse
from typing import Set

BASE62_ALPHABET = string.ascii_letters + string.digits  # a-zA-Z0-9 (len 62)
DEFAULT_CODE_LENGTH = 6

RESERVED_ALIASES: Set[str] = {
    "api",
    "docs",
    "health",
    "dashboard",
    "admin",
    "static",
    "_next",
    "favicon.ico",
    "robots.txt",
    "openapi.json",
}

ALIAS_REGEX = re.compile(r"^[A-Za-z0-9_-]{3,32}$")


def generate_short_code(length: int = DEFAULT_CODE_LENGTH) -> str:
    """Generate a random Base62 short code of specified length using secrets."""
    return "".join(secrets.choice(BASE62_ALPHABET) for _ in range(length))


def validate_alias(alias: str) -> bool:
    """
    Validate that a custom alias:
    - Matches 3-32 characters of [A-Za-z0-9_-]
    - Is not a reserved word (case-insensitive)
    """
    if not ALIAS_REGEX.match(alias):
        return False
    if alias.lower() in RESERVED_ALIASES:
        return False
    return True


def is_reserved_alias(alias: str) -> bool:
    return alias.lower() in RESERVED_ALIASES


def extract_host(url: str) -> str:
    """Extract lowercase host and port from a URL string."""
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        # Remove standard default ports if present
        if netloc.endswith(":80"):
            netloc = netloc[:-3]
        elif netloc.endswith(":443"):
            netloc = netloc[:-4]
        return netloc
    except Exception:
        return ""


def validate_target_url(url: str, short_base_url: str, frontend_origin: str) -> None:
    """
    Validate target URL:
    - Must be http or https
    - Max 2048 characters
    - Must have a valid network location (host)
    - Must not self-reference the backend or frontend hosts to prevent redirect loops
    Raises ValueError with explanatory message on failure.
    """
    if not url:
        raise ValueError("URL cannot be empty")

    if len(url) > 2048:
        raise ValueError("URL exceeds maximum length of 2048 characters")

    try:
        parsed = urlparse(url.strip())
    except Exception:
        raise ValueError("Malformed URL format")

    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError("URL scheme must be either http or https")

    target_host = extract_host(url)
    if not target_host:
        raise ValueError("URL must include a valid host name")

    backend_host = extract_host(short_base_url)
    frontend_host = extract_host(frontend_origin)

    if backend_host and target_host == backend_host:
        raise ValueError("URL cannot point to the shortener domain itself (redirect loop prevention)")

    if frontend_host and target_host == frontend_host:
        raise ValueError("URL cannot point to the frontend application domain (redirect loop prevention)")
