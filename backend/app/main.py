"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import (
    activity,
    assets,
    assignments,
    auth,
    categories,
    dashboard,
    laboratories,
    maintenance,
    reports,
    users,
)
from .seed import seed_database


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.auto_seed:
        with SessionLocal() as db:
            seed_database(db)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "REST API for the Computer Laboratory Asset Management System. "
        "Assets, laboratories, categories, assignments, maintenance, and reports."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(laboratories.router, prefix=api_prefix)
app.include_router(categories.router, prefix=api_prefix)
app.include_router(assets.router, prefix=api_prefix)
app.include_router(assignments.router, prefix=api_prefix)
app.include_router(maintenance.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(activity.router, prefix=api_prefix)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request, exc: IntegrityError):  # type: ignore[no-untyped-def]
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=409,
        content={"detail": "That change conflicts with an existing record."},
    )


@app.get("/api/health", tags=["system"])
def health() -> dict:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "health": "/api/health",
    }
