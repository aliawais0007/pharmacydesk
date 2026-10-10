from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth_routes import ensure_bootstrap_admin, router as auth_router
from app.config import settings
from app.database import SessionLocal, check_database_connection, engine
from app.dashboard_routes import router as dashboard_router
from app.models import Base
from app.routes import router
from app.user_routes import router as user_router


app = FastAPI(title="Pharmacy Management API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(router)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(dashboard_router)


@app.on_event("startup")
def initialize_local_schema_and_admin() -> None:
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                    "failed_login_attempts INTEGER NOT NULL DEFAULT 0"
                )
            )
            connection.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ")
            )
    with SessionLocal() as session:
        ensure_bootstrap_admin(session)


@app.get("/api/v1/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "pharmacy-api"}


@app.get("/api/v1/health/ready", tags=["health"])
def readiness() -> dict[str, str]:
    try:
        check_database_connection()
    except Exception as error:
        raise HTTPException(status_code=503, detail="Database is unavailable") from error
    return {"status": "ok", "service": "pharmacy-api", "database": "connected"}