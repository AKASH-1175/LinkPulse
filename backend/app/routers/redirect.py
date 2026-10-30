from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import RedirectResponse

from app.services.analytics import parse_client_details
import app.db as db

router = APIRouter(tags=["redirect"])


@router.get(
    "/{code}",
    response_class=RedirectResponse,
    status_code=status.HTTP_302_FOUND,
    summary="Redirect short code to original destination URL",
)
def handle_redirect(code: str, request: Request):
    """
    Look up short code, check expiration, log click synchronously,
    and return HTTP 302 redirect.
    """
    # 1. Fetch link
    link = db.get_link_by_code(code)
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Short link '{code}' not found",
        )

    # 2. Check expiration (UTC comparison)
    expires_at_raw = link.get("expires_at")
    if expires_at_raw:
        if isinstance(expires_at_raw, str):
            expires_at = datetime.fromisoformat(expires_at_raw.replace("Z", "+00:00"))
        elif isinstance(expires_at_raw, datetime):
            expires_at = expires_at_raw
        else:
            expires_at = None

        if expires_at and expires_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=f"Short link '{code}' has expired",
            )

    # 3. Synchronously log telemetry before returning redirect
    ua_header = request.headers.get("user-agent")
    referer_header = request.headers.get("referer") or request.headers.get("referrer")
    client_meta = parse_client_details(ua_header, referer_header)

    db.record_click_and_increment(
        link_id=link["id"],
        browser=client_meta["browser"],
        os_name=client_meta["os"],
        device=client_meta["device"],
        referrer=client_meta["referrer"],
    )

    # 4. Return HTTP 302 redirect (Never 301, to ensure every visit reaches serverless backend)
    return RedirectResponse(
        url=link["original_url"],
        status_code=status.HTTP_302_FOUND,
    )
