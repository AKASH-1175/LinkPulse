from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from collections import Counter
from user_agents import parse as parse_user_agent
from urllib.parse import urlparse


def parse_client_details(user_agent_str: Optional[str], referer_str: Optional[str]) -> Dict[str, Optional[str]]:
    """
    Parse browser, OS, device, and referrer from HTTP request headers.
    """
    browser = "Unknown"
    os_name = "Unknown"
    device = "PC"

    if user_agent_str:
        try:
            ua = parse_user_agent(user_agent_str)
            browser = ua.browser.family or "Unknown"
            os_name = ua.os.family or "Unknown"

            if ua.is_bot:
                device = "Bot"
            elif ua.is_mobile:
                device = "Mobile"
            elif ua.is_tablet:
                device = "Tablet"
            elif ua.is_pc:
                device = "PC"
            else:
                device = "Other"
        except Exception:
            pass

    # Normalize referrer
    referrer = None
    if referer_str and referer_str.strip():
        cleaned = referer_str.strip()
        try:
            parsed = urlparse(cleaned)
            # Use hostname or netloc as clean referrer display
            if parsed.netloc:
                referrer = parsed.netloc.lower()
            else:
                referrer = cleaned
        except Exception:
            referrer = cleaned

    return {
        "browser": browser,
        "os": os_name,
        "device": device,
        "referrer": referrer,
    }


def aggregate_click_stats(clicks: List[Dict[str, Any]], total_clicks: int) -> Dict[str, Any]:
    """
    Aggregate raw click records into structured metrics:
    - clicks_by_day: last 14 days, zero-filled, oldest to newest (YYYY-MM-DD)
    - browsers: list of {name, count} sorted desc
    - devices: list of {name, count} sorted desc
    - os: list of {name, count} sorted desc
    - referrers: top 5 referrers {name, count} sorted desc ('Direct' for empty/null)
    """
    # 1. 14-day zero-filled bucket in UTC
    now_utc = datetime.now(timezone.utc).date()
    date_buckets: Dict[str, int] = {}
    for i in range(13, -1, -1):
        day_str = (now_utc - timedelta(days=i)).isoformat()
        date_buckets[day_str] = 0

    browser_counts: Counter[str] = Counter()
    device_counts: Counter[str] = Counter()
    os_counts: Counter[str] = Counter()
    referrer_counts: Counter[str] = Counter()

    for click in clicks:
        # Tally date
        raw_time = click.get("clicked_at")
        if raw_time:
            if isinstance(raw_time, str):
                dt = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
            elif isinstance(raw_time, datetime):
                dt = raw_time
            else:
                dt = None

            if dt:
                day_key = dt.astimezone(timezone.utc).date().isoformat()
                if day_key in date_buckets:
                    date_buckets[day_key] += 1

        # Tally dimensions
        b = click.get("browser") or "Unknown"
        d = click.get("device") or "Unknown"
        o = click.get("os") or "Unknown"
        r = click.get("referrer")
        ref_label = r.strip() if r and r.strip() else "Direct"

        browser_counts[b] += 1
        device_counts[d] += 1
        os_counts[o] += 1
        referrer_counts[ref_label] += 1

    clicks_by_day = [{"date": d, "clicks": count} for d, count in date_buckets.items()]

    browsers = [{"name": name, "count": count} for name, count in browser_counts.most_common()]
    devices = [{"name": name, "count": count} for name, count in device_counts.most_common()]
    os_list = [{"name": name, "count": count} for name, count in os_counts.most_common()]
    referrers = [{"name": name, "count": count} for name, count in referrer_counts.most_common(5)]

    return {
        "clicks_by_day": clicks_by_day,
        "browsers": browsers,
        "devices": devices,
        "os": os_list,
        "referrers": referrers,
    }
