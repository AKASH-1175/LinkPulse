from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from app.config import get_settings

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Initialize and return a singleton Supabase client using the service role key."""
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _supabase_client


def get_link_by_code(code: str) -> Optional[Dict[str, Any]]:
    """Retrieve a link record by short code."""
    client = get_supabase_client()
    response = client.table("links").select("*").eq("code", code).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return None


def create_link(
    code: str,
    original_url: str,
    expires_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Insert a new link record.
    Raises an Exception (or postgrest error) on duplicate code/unique violation.
    """
    client = get_supabase_client()
    payload = {
        "code": code,
        "original_url": original_url,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "click_count": 0,
    }
    response = client.table("links").insert(payload).execute()
    if not response.data:
        raise RuntimeError("Failed to insert link")
    return response.data[0]


def list_links(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """List links sorted by created_at descending."""
    client = get_supabase_client()
    response = (
        client.table("links")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return response.data or []


def delete_link_by_code(code: str) -> bool:
    """Delete a link by code. Cascading foreign keys will delete associated clicks."""
    client = get_supabase_client()
    existing = get_link_by_code(code)
    if not existing:
        return False
    client.table("links").delete().eq("code", code).execute()
    return True


def record_click_and_increment(
    link_id: int,
    browser: Optional[str],
    os_name: Optional[str],
    device: Optional[str],
    referrer: Optional[str],
) -> None:
    """
    Synchronously record a click event and atomically increment the link's click count.
    Must not fail the redirect even if telemetry encounters an issue.
    """
    client = get_supabase_client()
    try:
        # 1. Insert click row
        click_payload = {
            "link_id": link_id,
            "browser": browser,
            "os": os_name,
            "device": device,
            "referrer": referrer,
        }
        client.table("clicks").insert(click_payload).execute()

        # 2. Call stored procedure to increment click_count atomically
        try:
            client.rpc("increment_click_count", {"p_link_id": link_id}).execute()
        except Exception:
            # Fallback if RPC fails or is missing: direct update
            link_data = client.table("links").select("click_count").eq("id", link_id).execute()
            if link_data.data:
                current_count = link_data.data[0].get("click_count", 0)
                client.table("links").update({"click_count": current_count + 1}).eq("id", link_id).execute()
    except Exception as e:
        # Log to stdout for serverless observability without breaking the redirect
        print(f"[LinkPulse Telemetry Error] Failed to log click for link_id={link_id}: {e}")


def get_clicks_for_link(link_id: int) -> List[Dict[str, Any]]:
    """Retrieve all click rows for a link."""
    client = get_supabase_client()
    response = (
        client.table("clicks")
        .select("clicked_at, browser, os, device, referrer")
        .eq("link_id", link_id)
        .order("clicked_at", desc=True)
        .execute()
    )
    return response.data or []
