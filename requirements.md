# LinkPulse: Requirements

## 1. Overview
LinkPulse is a serverless URL shortener with click analytics. A Next.js frontend on Vercel talks to a Python FastAPI backend (Vercel serverless functions), which stores data in Supabase PostgreSQL.

## 2. Goals
- Shorten URLs with optional custom alias and expiry.
- Redirect short links and record click analytics.
- Show per-link statistics in a dashboard.
- Demonstrate cloud concepts: serverless compute, managed database, CI/CD, secrets management, scalability.

## 3. Functional Requirements
- FR-1: Create a short link from a long URL.
- FR-2: Optional custom alias (3-32 chars, `A-Za-z0-9_-`), rejected if taken or reserved.
- FR-3: Optional expiry: never, 1 hour, 24 hours, 7 days, 30 days.
- FR-4: `GET /{code}` redirects with HTTP 302 and records a click.
- FR-5: Expired links return 410; unknown codes return 404.
- FR-6: List all links with total click counts, newest first.
- FR-7: Per-link stats: total clicks, clicks per day (last 14 days, zero-filled), top browsers, devices, operating systems, top 5 referrers ("Direct" when empty).
- FR-8: Delete a link (its clicks are deleted too).
- FR-9: Dashboard UI for creating, listing, copying, viewing stats and deleting links.

## 4. Non-Functional Requirements
- Serverless: no always-on servers.
- Redirect responds quickly (target under 500 ms warm).
- No secrets in the repository or the frontend bundle.
- All timestamps stored in UTC.
- Responsive UI.

## 5. Data Model (database/schema.sql)

```sql
create table if not exists links (
  id bigint generated always as identity primary key,
  code text not null unique,
  original_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  click_count bigint not null default 0
);

create table if not exists clicks (
  id bigint generated always as identity primary key,
  link_id bigint not null references links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  browser text,
  os text,
  device text,
  referrer text
);

create index if not exists idx_clicks_link_time on clicks (link_id, clicked_at);

create or replace function increment_click_count(p_link_id bigint)
returns void language sql as $$
  update links set click_count = click_count + 1 where id = p_link_id;
$$;

alter table links enable row level security;
alter table clicks enable row level security;
-- No policies: only the backend (service role key) accesses the data.
```

## 6. API Contract
- `GET /api/health` → `{ "status": "ok" }`
- `POST /api/links` body `{ "url": string, "alias"?: string, "expires_in_hours"?: number }` → 201 `{ "code", "short_url", "original_url", "created_at", "expires_at" }`. Errors: 400 invalid URL, 409 alias taken, 422 validation.
- `GET /api/links?limit=50&offset=0` → `[{ "code", "short_url", "original_url", "created_at", "expires_at", "click_count" }]`
- `GET /api/links/{code}/stats` → `{ "code", "original_url", "created_at", "expires_at", "total_clicks", "clicks_by_day": [{"date","clicks"}], "browsers": [{"name","count"}], "devices": [...], "os": [...], "referrers": [...] }`. 404 if unknown.
- `DELETE /api/links/{code}` → 204. 404 if unknown.
- `GET /{code}` → 302 to original URL after logging the click. 404 unknown, 410 expired.

## 7. Validation and Security Rules
- URL must be `http` or `https`, max 2048 characters.
- Reject URLs pointing to the app's own hosts (`SHORT_BASE_URL` host and the frontend host) to prevent redirect loops.
- Reserved aliases: api, docs, health, dashboard, admin, static, _next, favicon.ico, robots.txt.
- CORS allows only `FRONTEND_ORIGIN` (plus `http://localhost:3000` for local development).
- Supabase service role key exists only in backend environment variables.
- Parse the User-Agent for browser, OS and device; store `referrer` from the Referer header (may be empty).

## 8. Environment Variables
Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SHORT_BASE_URL`, `FRONTEND_ORIGIN`
Frontend: `NEXT_PUBLIC_API_BASE_URL`

## 9. Frontend Pages
- `/`: hero, create-link form (URL, optional alias, expiry dropdown), result card with the short URL and a copy button.
- `/dashboard`: table of links (short code, truncated original URL, clicks, created, expires, actions: copy, view stats, delete) with empty and loading states.
- `/dashboard/[code]`: stat cards (total clicks, created, expiry status), a clicks-per-day chart (Recharts), and breakdown lists for browsers, devices, OS and referrers.

## 10. Acceptance Criteria
- Creating a link returns a working short URL.
- Opening it redirects with 302 and increments the click count.
- Stats page reflects the click within a page refresh.
- Expired link returns 410; duplicate alias returns 409.
- Backend tests pass; frontend builds without errors.
- Both apps deploy on Vercel and work end to end.

## 11. Stretch Goals (only if everything above is done)
- QR code for each short link.
- Supabase Auth so each user sees only their own links.
- Rate limiting on link creation.
- Optional Dockerfile and docker-compose for local development.
