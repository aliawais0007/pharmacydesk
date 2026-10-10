from collections.abc import Generator
from decimal import Decimal

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.models import Base, User
from app.routes import router
from app.security import get_current_user


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
        test_admin = User(
            email="test-admin@example.test",
            full_name="Test Admin",
            password_hash="unused-in-route-test",
            role="admin",
            is_active=True,
        )
        session.add(test_admin)
        session.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    test_app = FastAPI()
    test_app.include_router(router)
    test_app.dependency_overrides[get_db] = override_get_db
    test_app.dependency_overrides[get_current_user] = lambda: test_admin

    with TestClient(test_app) as test_client:
        yield test_client

    Base.metadata.drop_all(engine)
    engine.dispose()


def create_catalogue(client: TestClient) -> tuple[int, int]:
    medicine_response = client.post(
        "/api/v1/medicines",
        json={
            "name": "Test Paracetamol",
            "generic_name": "Paracetamol",
            "unit_label": "strip",
        },
    )
    supplier_response = client.post(
        "/api/v1/suppliers",
        json={"name": "Test Distributor", "phone": "03001234567"},
    )
    assert medicine_response.status_code == 201
    assert supplier_response.status_code == 201
    return medicine_response.json()["id"], supplier_response.json()["id"]


def receive_batch(
    client: TestClient,
    medicine_id: int,
    supplier_id: int,
    batch_number: str,
    expiry_date: str,
    quantity: int,
    sale_price: str,
) -> None:
    response = client.post(
        f"/api/v1/medicines/{medicine_id}/batches",
        json={
            "supplier_id": supplier_id,
            "batch_number": batch_number,
            "expiry_date": expiry_date,
            "quantity": quantity,
            "purchase_price": "80.00",
            "sale_price": sale_price,
            "supplier_invoice": "INV-1001",
        },
    )
    assert response.status_code == 201, response.text


def test_sale_uses_earliest_expiry_and_rejects_oversell(client: TestClient) -> None:
    medicine_id, supplier_id = create_catalogue(client)
    receive_batch(client, medicine_id, supplier_id, "EARLY", "2027-06-30", 2, "110.00")
    receive_batch(client, medicine_id, supplier_id, "LATER", "2028-06-30", 5, "130.00")

    sale_response = client.post(
        "/api/v1/sales",
        json={
            "customer_name": "Walk-in",
            "payment_method": "cash",
            "discount_amount": "10.00",
            "lines": [{"medicine_id": medicine_id, "quantity": 4}],
        },
    )

    assert sale_response.status_code == 201, sale_response.text
    sale = sale_response.json()
    assert sale["receipt_number"].startswith("PS-")
    assert Decimal(sale["subtotal"]) == Decimal("480.00")
    assert Decimal(sale["total"]) == Decimal("470.00")
    assert [(line["batch_number"], line["quantity"]) for line in sale["lines"]] == [
        ("EARLY", 2),
        ("LATER", 2),
    ]

    oversell_response = client.post(
        "/api/v1/sales",
        json={"payment_method": "cash", "lines": [{"medicine_id": medicine_id, "quantity": 4}]},
    )
    assert oversell_response.status_code == 409

    batches = client.get(f"/api/v1/medicines/{medicine_id}/batches").json()
    assert [batch["quantity_remaining"] for batch in batches] == [0, 3]


def test_archiving_medicine_keeps_sales_and_stock_history(client: TestClient) -> None:
    medicine_id, supplier_id = create_catalogue(client)
    receive_batch(client, medicine_id, supplier_id, "KEEP", "2028-06-30", 3, "95.00")
    sale_response = client.post(
        "/api/v1/sales",
        json={"payment_method": "cash", "lines": [{"medicine_id": medicine_id, "quantity": 1}]},
    )
    assert sale_response.status_code == 201

    archive_response = client.delete(f"/api/v1/medicines/{medicine_id}")
    assert archive_response.status_code == 204
    assert client.get("/api/v1/medicines").json() == []
    archived = client.get("/api/v1/medicines?include_inactive=true").json()
    assert archived[0]["is_active"] is False
    assert client.get(f"/api/v1/sales/{sale_response.json()['id']}").status_code == 200