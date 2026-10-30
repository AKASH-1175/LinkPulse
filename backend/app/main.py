from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import links, redirect

settings = get_settings()

app = FastAPI(
    title="LinkPulse API",
    description="Serverless URL Shortener with Real-Time Click Analytics",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if settings.FRONTEND_ORIGIN and settings.FRONTEND_ORIGIN not in allowed_origins:
    allowed_origins.append(settings.FRONTEND_ORIGIN.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["health"])
def health_check():
    """Health check endpoint to verify backend operational readiness."""
    return {"status": "ok"}


# IMPORTANT: Register /api/* routes BEFORE the catch-all /{code} redirect router
app.include_router(links.router)
app.include_router(redirect.router)
