import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.codegen import (
    generate_short_code,
    validate_alias,
    is_reserved_alias,
    validate_target_url,
    BASE62_ALPHABET,
)
from app.services.analytics import aggregate_click_stats, parse_client_details

client = TestClient(app, follow_redirects=False)


# --- 1. Base62 Code Format and Length ---
def test_base62_code_format_and_length():
    """Verify that generated short codes are exactly 6 characters and use Base62 chars."""
    for _ in range(50):
        code = generate_short_code()
        assert len(code) == 6
        assert all(c in BASE62_ALPHABET for c in code)


# --- 2. Collision Retry ---
def test_collision_retry_success():
    """Verify link creation retries on code collision and succeeds when a free code is found."""
    attempts = [
        {"code": "exist1"},  # Collision 1
        {"code": "exist2"},  # Collision 2
        None,                 # Success candidate
    ]

    with patch("app.db.get_link_by_code", side_effect=attempts), \
         patch("app.db.create_link") as mock_create:
        mock_create.return_value = {
            "id": 10,
            "code": "free01",
            "original_url": "https://example.com/target",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": None,
            "click_count": 0,
        }

        response = client.post("/api/links", json={"url": "https://example.com/target"})
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "free01"
        assert mock_create.called


def test_collision_retry_exhausted():
    """Verify link creation returns 500 when all 5 generation attempts collide."""
    with patch("app.db.get_link_by_code", return_value={"code": "always_taken"}):
        response = client.post("/api/links", json={"url": "https://example.com/target"})
        assert response.status_code == 500
        assert "Unable to generate a unique short code" in response.json()["detail"]


# --- 3. Alias Validation ---
def test_alias_validation():
    """Test valid and invalid custom aliases."""
    # Valid
    assert validate_alias("my-link_123") is True
    assert validate_alias("abc") is True
    assert validate_alias("A" * 32) is True

    # Invalid length
    assert validate_alias("ab") is False  # < 3
    assert validate_alias("A" * 33) is False  # > 32

    # Invalid characters
    assert validate_alias("my link") is False  # space
    assert validate_alias("link@123") is False  # special char


# --- 4. Reserved Aliases ---
def test_reserved_aliases():
    """Test that system routes cannot be used as custom aliases."""
    reserved = ["api", "docs", "health", "dashboard", "admin", "static", "_next", "favicon.ico", "robots.txt"]
    for word in reserved:
        assert is_reserved_alias(word) is True
        assert validate_alias(word) is False

        response = client.post("/api/links", json={"url": "https://example.com", "alias": word})
        assert response.status_code == 409
        assert "reserved" in response.json()["detail"].lower()


# --- 5. Invalid URL Schemes ---
def test_invalid_url_schemes():
    """Test rejection of non-http/https URL schemes."""
    invalid_urls = [
        "ftp://files.example.com",
        "javascript:alert(1)",
        "mailto:test@example.com",
        "data:text/plain;base64,SGVsbG8=",
        "not_a_url",
    ]
    for url in invalid_urls:
        response = client.post("/api/links", json={"url": url})
        assert response.status_code == 400


# --- 6. Self-Referencing URLs ---
def test_self_referencing_urls():
    """Test rejection of URLs pointing back to the shortener or frontend host."""
    with patch("app.routers.links.get_settings") as mock_settings:
        mock_settings.return_value = MagicMock(
            SHORT_BASE_URL="http://localhost:8000",
            FRONTEND_ORIGIN="http://localhost:3000",
        )
        # Point to backend host
        resp1 = client.post("/api/links", json={"url": "http://localhost:8000/some-code"})
        assert resp1.status_code == 400
        assert "redirect loop" in resp1.json()["detail"]

        # Point to frontend host
        resp2 = client.post("/api/links", json={"url": "http://localhost:3000/dashboard"})
        assert resp2.status_code == 400
        assert "redirect loop" in resp2.json()["detail"]


# --- 7. Redirect Returns 302 with Location Header & Synchronous Logging ---
def test_redirect_returns_302_and_logs_click():
    """Verify that visiting /{code} logs telemetry synchronously and returns HTTP 302 redirect."""
    fake_link = {
        "id": 42,
        "code": "redrct",
        "original_url": "https://news.ycombinator.com",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None,
        "click_count": 5,
    }

    with patch("app.db.get_link_by_code", return_value=fake_link), \
         patch("app.db.record_click_and_increment") as mock_record:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://google.com/search",
        }
        response = client.get("/redrct", headers=headers, follow_redirects=False)

        assert response.status_code == 302
        assert response.headers["location"] == "https://news.ycombinator.com"
        assert mock_record.called
        # Verify telemetry args
        args = mock_record.call_args[1]
        assert args["link_id"] == 42
        assert "Chrome" in args["browser"]
        assert "Windows" in args["os_name"]
        assert args["device"] == "PC"
        assert "google.com" in args["referrer"]


# --- 8. Expired Link Returns 410 ---
def test_expired_link_returns_410():
    """Verify that navigating to an expired link returns HTTP 410 Gone."""
    expired_time = datetime.now(timezone.utc) - timedelta(hours=2)
    fake_link = {
        "id": 99,
        "code": "expired",
        "original_url": "https://example.com/expired",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "expires_at": expired_time.isoformat(),
        "click_count": 10,
    }

    with patch("app.db.get_link_by_code", return_value=fake_link):
        response = client.get("/expired")
        assert response.status_code == 410
        assert "expired" in response.json()["detail"].lower()


# --- 9. Unknown Code Returns 404 ---
def test_unknown_code_returns_404():
    """Verify that nonexistent short codes return HTTP 404 for redirect and stats."""
    with patch("app.db.get_link_by_code", return_value=None):
        # Redirect route
        r1 = client.get("/nonexistent")
        assert r1.status_code == 404

        # Stats route
        r2 = client.get("/api/links/nonexistent/stats")
        assert r2.status_code == 404


# --- 10. Stats Aggregation ---
def test_stats_aggregation():
    """Verify 14-day zero-filled bucketing, browser, os, device, and top referrers counting."""
    now_utc = datetime.now(timezone.utc)
    clicks = [
        {
            "clicked_at": now_utc.isoformat(),
            "browser": "Chrome",
            "os": "Windows",
            "device": "PC",
            "referrer": "twitter.com",
        },
        {
            "clicked_at": now_utc.isoformat(),
            "browser": "Chrome",
            "os": "Windows",
            "device": "PC",
            "referrer": "twitter.com",
        },
        {
            "clicked_at": (now_utc - timedelta(days=2)).isoformat(),
            "browser": "Safari",
            "os": "iOS",
            "device": "Mobile",
            "referrer": None,  # Should become 'Direct'
        },
    ]

    stats = aggregate_click_stats(clicks, total_clicks=3)
    # Check 14-day zero-filled array
    assert len(stats["clicks_by_day"]) == 14
    today_str = now_utc.date().isoformat()
    today_bucket = next(b for b in stats["clicks_by_day"] if b["date"] == today_str)
    assert today_bucket["clicks"] == 2

    # Check top dimensions
    assert stats["browsers"][0] == {"name": "Chrome", "count": 2}
    assert stats["browsers"][1] == {"name": "Safari", "count": 1}

    assert stats["os"][0] == {"name": "Windows", "count": 2}
    assert stats["os"][1] == {"name": "iOS", "count": 1}

    assert stats["devices"][0] == {"name": "PC", "count": 2}
    assert stats["devices"][1] == {"name": "Mobile", "count": 1}

    # Top Referrers ("Direct" for None)
    ref_names = [r["name"] for r in stats["referrers"]]
    assert "twitter.com" in ref_names
    assert "Direct" in ref_names


# --- 11. Health Check Endpoint ---
def test_health_check():
    """Verify /api/health returns ok status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# --- 12. Delete Link ---
def test_delete_link():
    """Verify deleting an existing link returns 204, and nonexistent returns 404."""
    with patch("app.db.delete_link_by_code", return_value=True):
        res = client.delete("/api/links/mycode")
        assert res.status_code == 204

    with patch("app.db.delete_link_by_code", return_value=False):
        res = client.delete("/api/links/missing")
        assert res.status_code == 404
