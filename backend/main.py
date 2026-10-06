import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI

from fastapi.middleware.cors import (
    CORSMiddleware
)

from sqlalchemy import text
from backend.services.schema_migrations import ensure_finding_provenance

from backend.database import (
    Base,
    engine
)


# ==========================================
# IMPORT MODELS
# ==========================================

from backend.models.models import (
    Alert,
    AuditLog,
    AuthSession,
    Finding,
    Report,
    Source,
    User,
    Watchlist
)


# ==========================================
# IMPORT ROUTERS
# ==========================================

from backend.routes.auth import (
    router as auth_router
)

from backend.routes.dashboard import (
    router as dashboard_router
)

from backend.routes.watchlists import (
    router as watchlist_router
)

from backend.routes.scan import (
    router as scan_router
)

from backend.routes.findings import (
    router as findings_router
)

from backend.routes.alerts import (
    router as alerts_router
)

from backend.routes.reports import (
    router as reports_router
)

from backend.routes.user import (
    router as users_router
)

from backend.routes.audit import (
    router as audit_router
)

from backend.routes.elasticsearch import (
    router as elasticsearch_router
)

from backend.routes.risk_scoring_test import (
    router as risk_scoring_test_router
)


# ==========================================
# CREATE DATABASE TABLES
# ==========================================

Base.metadata.create_all(
    bind=engine
)

ensure_finding_provenance(engine)


# ==========================================
# CREATE FASTAPI APP
# ==========================================

app = FastAPI(

    title=(
        "Deep Dark Web "
        "Monitoring API"
    ),

    version="1.0.0"
)


# ==========================================
# CORS
# ==========================================

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

configured_origins = os.getenv(
    "CORS_ORIGINS",
    ""
)

if configured_origins.strip():

    allowed_origins = [
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    ]

else:

    allowed_origins = default_origins


app.add_middleware(
    CORSMiddleware,

    allow_origins=allowed_origins,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# ==========================================
# ROUTERS
# ==========================================

app.include_router(
    auth_router
)

app.include_router(
    dashboard_router
)

app.include_router(
    watchlist_router
)

app.include_router(
    scan_router
)

app.include_router(
    findings_router
)

app.include_router(
    alerts_router
)

app.include_router(
    reports_router
)

app.include_router(
    users_router
)

app.include_router(
    audit_router
)

app.include_router(
    elasticsearch_router
)

app.include_router(
    risk_scoring_test_router
)


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():

    return {

        "message":
            "Deep Dark Web Monitoring API is running"
    }


# ==========================================
# DATABASE HEALTH CHECK
# ==========================================

@app.get("/health")
def health():

    try:

        with engine.connect() as connection:

            connection.execute(
                text(
                    "SELECT 1"
                )
            )


        return {

            "status":
                "healthy",

            "database":
                "connected"
        }


    except Exception as error:

        return {

            "status":
                "unhealthy",

            "database":
                "disconnected",

            "error":
                str(error)
        }
