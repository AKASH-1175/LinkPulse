from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl


class LinkCreateRequest(BaseModel):
    url: str = Field(..., max_length=2048, description="Target destination URL")
    alias: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=32,
        description="Optional custom short code (3-32 alphanumeric or '-' / '_')",
    )
    expires_in_hours: Optional[float] = Field(
        default=None,
        gt=0,
        description="Optional link lifetime in hours (e.g. 1, 24, 168, 720)",
    )


class LinkResponse(BaseModel):
    code: str
    short_url: str
    original_url: str
    created_at: datetime
    expires_at: Optional[datetime] = None


class LinkListItemResponse(BaseModel):
    code: str
    short_url: str
    original_url: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    click_count: int


class MetricCount(BaseModel):
    name: str
    count: int


class DayClicks(BaseModel):
    date: str  # YYYY-MM-DD
    clicks: int


class LinkStatsResponse(BaseModel):
    code: str
    original_url: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    total_clicks: int
    clicks_by_day: List[DayClicks]
    browsers: List[MetricCount]
    devices: List[MetricCount]
    os: List[MetricCount]
    referrers: List[MetricCount]
