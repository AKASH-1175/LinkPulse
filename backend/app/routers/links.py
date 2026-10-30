from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.config import get_settings
from app.models import (
    LinkCreateRequest,
    LinkResponse,
    LinkListItemResponse,
    LinkStatsResponse,
)
from app.services.codegen import (
    generate_short_code,
    validate_alias,
    is_reserved_alias,
    validate_target_url,
)
from app.services.analytics import aggregate_click_stats
import app.db as db

router = APIRouter(prefix="/api/links", tags=["links"])


@router.post(
    "",
    response_model=LinkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a shortened link",
)
def create_link(payload: LinkCreateRequest) -> LinkResponse:
    settings = get_settings()

    # 1. Validate Target URL
    try:
        validate_target_url(
            url=payload.url,
            short_base_url=settings.SHORT_BASE_URL,
            frontend_origin=settings.FRONTEND_ORIGIN,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # 2. Compute Expiry if provided
    expires_at: Optional[datetime] = None
    if payload.expires_in_hours is not None:
        if payload.expires_in_hours <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Expiry hours must be greater than zero",
            )
        expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expires_in_hours)

    # 3. Handle Code Assignment (Custom Alias vs Generated Base62)
    final_code: str
    if payload.alias:
        raw_alias = payload.alias.strip()

        if is_reserved_alias(raw_alias):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Alias '{raw_alias}' is reserved by the system",
            )

        if not validate_alias(raw_alias):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Custom alias must be 3-32 characters of letters, numbers, underscores, or hyphens",
            )

        # Check collision in DB
        existing = db.get_link_by_code(raw_alias)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Alias '{raw_alias}' is already in use",
            )
        final_code = raw_alias
        try:
            created = db.create_link(
                code=final_code,
                original_url=payload.url.strip(),
                expires_at=expires_at,
            )
        except Exception as e:
            # Check for concurrent duplicate insertion
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Alias '{raw_alias}' is already in use",
            )
    else:
        # Retry up to 5 times on unique collision
        inserted = None
        for attempt in range(5):
            candidate_code = generate_short_code()
            if db.get_link_by_code(candidate_code):
                continue
            try:
                inserted = db.create_link(
                    code=candidate_code,
                    original_url=payload.url.strip(),
                    expires_at=expires_at,
                )
                final_code = candidate_code
                break
            except Exception:
                # Collision during concurrent insertion, retry
                continue

        if not inserted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to generate a unique short code after 5 attempts. Please try again.",
            )
        created = inserted

    base_url = settings.SHORT_BASE_URL.rstrip("/")
    short_url = f"{base_url}/{created['code']}"

    return LinkResponse(
        code=created["code"],
        short_url=short_url,
        original_url=created["original_url"],
        created_at=created["created_at"],
        expires_at=created.get("expires_at"),
    )


@router.get(
    "",
    response_model=List[LinkListItemResponse],
    summary="List all shortened links with click counts",
)
def list_links(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> List[LinkListItemResponse]:
    settings = get_settings()
    base_url = settings.SHORT_BASE_URL.rstrip("/")
    rows = db.list_links(limit=limit, offset=offset)

    results = []
    for row in rows:
        results.append(
            LinkListItemResponse(
                code=row["code"],
                short_url=f"{base_url}/{row['code']}",
                original_url=row["original_url"],
                created_at=row["created_at"],
                expires_at=row.get("expires_at"),
                click_count=row.get("click_count", 0),
            )
        )
    return results


@router.get(
    "/{code}/stats",
    response_model=LinkStatsResponse,
    summary="Get analytics and click statistics for a specific short link",
)
def get_link_stats(code: str) -> LinkStatsResponse:
    link = db.get_link_by_code(code)
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Short link with code '{code}' not found",
        )

    clicks = db.get_clicks_for_link(link["id"])
    total_clicks = link.get("click_count", len(clicks))
    aggregated = aggregate_click_stats(clicks, total_clicks=total_clicks)

    return LinkStatsResponse(
        code=link["code"],
        original_url=link["original_url"],
        created_at=link["created_at"],
        expires_at=link.get("expires_at"),
        total_clicks=total_clicks,
        clicks_by_day=aggregated["clicks_by_day"],
        browsers=aggregated["browsers"],
        devices=aggregated["devices"],
        os=aggregated["os"],
        referrers=aggregated["referrers"],
    )


@router.delete(
    "/{code}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a short link and its analytics",
)
def delete_link(code: str):
    deleted = db.delete_link_by_code(code)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Short link with code '{code}' not found",
        )
    return None
