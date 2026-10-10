from collections.abc import Generator
from datetime import date, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth_routes import router as auth_router
from app.database import get_db
from app.dashboard_routes import router as dashboard_router
from app.models import Base, User
from app.routes import router as pharmacy_router
from app.security import hash_password
from app.user_routes import router as user_router


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with session_factory() as session:
        session.add_all(
            [
                User(
                    email="admin@example.test",
                    full_name="Test Admin",
                    password_hash=hash_password("test-admin-password-123"),
                    role="admin",
                    is_active=True,
                ),
                User(
                    email="cashier@example.test",
                    full_name="Test Cashier",
                    password_hash=hash_password("test-cashier-password-123"),
                    role="cashier",
                    is_active=True,
                ),
            ]
        )
        session.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    test_app = FastAPI()
    test_app.include_router(auth_router)
    test_app.include_router(pharmacy_router)
    test_app.include_router(user_router)
    test_app.include_router(dashboard_router)
    test_app.dependency_overrides[get_db] = override_get_db
    with TestClient(test_app) as test_client:
        yield test_client
    Base.metadata.drop_all(engine)
    engine.dispose()


def login(client: TestClient, email: str, password: str) -> tuple[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"], response.cookies["pharmacy_refresh"]


def test_login_refresh_rotation_logout_and_anonymous_denial(client: TestClient) -> None:
    assert client.get("/api/v1/medicines").status_code == 401

    access_token, old_refresh = login(client, "admin@example.test", "test-admin-password-123")
    assert client.get("/api/v1/medicines", headers={"Authorization": f"Bearer {access_token}"}).status_code == 200

    refresh = client.post("/api/v1/auth/refresh", cookies={"pharmacy_refresh": old_refresh})
    assert refresh.status_code == 200, refresh.text
    rotated_refresh = refresh.cookies["pharmacy_refresh"]
    assert rotated_refresh != old_refresh

    replay = client.post("/api/v1/auth/refresh", cookies={"pharmacy_refresh": old_refresh})
    assert replay.status_code == 401
    assert client.post("/api/v1/auth/refresh", cookies={"pharmacy_refresh": rotated_refresh}).status_code == 401


def test_admin_can_manage_users_but_cashier_cannot(client: TestClient) -> None:
    admin_token, _ = login(client, "admin@example.test", "test-admin-password-123")
    created = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "manager@example.test",
            "full_name": "Test Manager",
            "password": "test-manager-password-123",
            "role": "manager",
        },
    )
    assert created.status_code == 201, created.text
    assert client.get("/api/v1/users", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200

    cashier_token, _ = login(client, "cashier@example.test", "test-cashier-password-123")
    cashier_headers = {"Authorization": f"Bearer {cashier_token}"}
    assert client.get("/api/v1/sales", headers=cashier_headers).status_code == 200
    assert client.get("/api/v1/users", headers=cashier_headers).status_code == 403
    assert client.post("/api/v1/medicines", headers=cashier_headers, json={"name": "Not allowed"}).status_code == 403


def test_logout_revokes_refresh_session(client: TestClient) -> None:
    _, refresh_cookie = login(client, "admin@example.test", "test-admin-password-123")
    logout = client.post("/api/v1/auth/logout", cookies={"pharmacy_refresh": refresh_cookie})
    assert logout.status_code == 204
    refresh = client.post("/api/v1/auth/refresh", cookies={"pharmacy_refresh": refresh_cookie})
    assert refresh.status_code == 401


def test_login_lockout_after_repeated_failed_passwords(client: TestClient) -> None:
    for _ in range(5):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.test", "password": "incorrect-password"},
        )
        assert response.status_code == 401

    locked = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.test", "password": "test-admin-password-123"},
    )
    assert locked.status_code == 429


def test_dashboard_summarizes_sales_low_stock_and_expiry(client: TestClient) -> None:
    token, _ = login(client, "admin@example.test", "test-admin-password-123")
    headers = {"Authorization": f"Bearer {token}"}
    medicine = client.post(
        "/api/v1/medicines",
        headers=headers,
        json={"name": "Dashboard Test Medicine", "unit_label": "pack", "reorder_level": 5},
    )
    assert medicine.status_code == 201
    medicine_id = medicine.json()["id"]
    expiry = (date.today() + timedelta(days=45)).isoformat()
    batch = client.post(
        f"/api/v1/medicines/{medicine_id}/batches",
        headers=headers,
        json={
            "batch_number": "DASH-EXP-01",
            "expiry_date": expiry,
            "quantity": 3,
            "purchase_price": "70.00",
            "sale_price": "120.00",
        },
    )
    assert batch.status_code == 201
    sale = client.post(
        "/api/v1/sales",
        headers=headers,
        json={"payment_method": "cash", "lines": [{"medicine_id": medicine_id, "quantity": 1}]},
    )
    assert sale.status_code == 201

    dashboard = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dashboard.status_code == 200, dashboard.text
    summary = dashboard.json()
    assert summary["today_sales_count"] == 1
    assert summary["today_sales_total"] == "120.00"
    assert summary["active_medicines_count"] == 1
    assert summary["low_stock_count"] == 1
    assert summary["near_expiry_count"] == 1
    assert summary["top_medicines"][0]["name"] == "Dashboard Test Medicine"
    assert summary["near_expiry_batches"][0]["batch_number"] == "DASH-EXP-01"
