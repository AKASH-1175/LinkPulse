export interface LinkCreatePayload {
  url: string;
  alias?: string;
  expires_in_hours?: number;
}

export interface LinkItem {
  code: string;
  short_url: string;
  original_url: string;
  created_at: string;
  expires_at: string | null;
  click_count?: number;
}

export interface MetricCount {
  name: string;
  count: number;
}

export interface DayClicks {
  date: string;
  clicks: number;
}

export interface LinkStats {
  code: string;
  original_url: string;
  created_at: string;
  expires_at: string | null;
  total_clicks: number;
  clicks_by_day: DayClicks[];
  browsers: MetricCount[];
  devices: MetricCount[];
  os: MetricCount[];
  referrers: MetricCount[];
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const errData = await res.json();
      if (errData && errData.detail) {
        if (typeof errData.detail === "string") {
          errorMessage = errData.detail;
        } else if (Array.isArray(errData.detail)) {
          // Pydantic validation errors
          errorMessage = errData.detail
            .map((item: { msg?: string }) => item.msg || "Invalid input")
            .join(", ");
        }
      }
    } catch {
      // Body was not json
    }
    throw new ApiError(errorMessage, res.status);
  }

  if (res.status === 204) {
    return null as unknown as T;
  }

  return res.json();
}

export async function createLink(payload: LinkCreatePayload): Promise<LinkItem> {
  const res = await fetch(`${API_BASE_URL}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<LinkItem>(res);
}

export async function listLinks(limit = 50, offset = 0): Promise<LinkItem[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/links?limit=${limit}&offset=${offset}`,
    {
      cache: "no-store",
    }
  );
  return handleResponse<LinkItem[]>(res);
}

export async function getLinkStats(code: string): Promise<LinkStats> {
  const res = await fetch(`${API_BASE_URL}/api/links/${encodeURIComponent(code)}/stats`, {
    cache: "no-store",
  });
  return handleResponse<LinkStats>(res);
}

export async function deleteLink(code: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/links/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
}
