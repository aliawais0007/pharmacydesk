from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MedicineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    generic_name: str | None = Field(default=None, max_length=160)
    brand: str | None = Field(default=None, max_length=120)
    strength: str | None = Field(default=None, max_length=80)
    dosage_form: str | None = Field(default=None, max_length=80)
    unit_label: str = Field(default="pack", min_length=1, max_length=40)
    barcode: str | None = Field(default=None, max_length=80)
    manufacturer: str | None = Field(default=None, max_length=160)
    reorder_level: int = Field(default=0, ge=0)


class MedicineUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    generic_name: str | None = Field(default=None, max_length=160)
    brand: str | None = Field(default=None, max_length=120)
    strength: str | None = Field(default=None, max_length=80)
    dosage_form: str | None = Field(default=None, max_length=80)
    unit_label: str | None = Field(default=None, min_length=1, max_length=40)
    barcode: str | None = Field(default=None, max_length=80)
    manufacturer: str | None = Field(default=None, max_length=160)
    reorder_level: int | None = Field(default=None, ge=0)


class MedicineRead(ORMModel):
    id: int
    name: str
    generic_name: str | None
    brand: str | None
    strength: str | None
    dosage_form: str | None
    unit_label: str
    barcode: str | None
    manufacturer: str | None
    reorder_level: int
    is_active: bool
    available_stock: int = 0
    sale_price: Decimal | None = None


class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    contact_person: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=160)
    address: str | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    contact_person: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=160)
    address: str | None = None
    notes: str | None = None


class SupplierRead(ORMModel):
    id: int
    name: str
    contact_person: str | None
    phone: str | None
    email: str | None
    address: str | None
    notes: str | None
    is_active: bool


class BatchCreate(BaseModel):
    supplier_id: int | None = None
    batch_number: str = Field(min_length=1, max_length=100)
    expiry_date: date
    quantity: int = Field(gt=0)
    purchase_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    sale_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    supplier_invoice: str | None = Field(default=None, max_length=100)


class BatchRead(ORMModel):
    id: int
    medicine_id: int
    supplier_id: int | None
    batch_number: str
    expiry_date: date
    quantity_received: int
    quantity_remaining: int
    purchase_price: Decimal
    sale_price: Decimal
    supplier_invoice: str | None
    supplier_name: str | None = None


class SaleLineCreate(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    customer_name: str | None = Field(default=None, max_length=160)
    customer_phone: str | None = Field(default=None, max_length=40)
    payment_method: Literal["cash", "card", "mobile_wallet"] = "cash"
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    lines: list[SaleLineCreate] = Field(min_length=1)


class SaleLineRead(ORMModel):
    id: int
    medicine_id: int
    medicine_name: str
    batch_number: str
    expiry_date: date
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class SaleRead(ORMModel):
    id: int
    receipt_number: str
    customer_name: str | None
    customer_phone: str | None
    payment_method: str
    subtotal: Decimal
    discount_amount: Decimal
    total: Decimal
    created_at: datetime
    lines: list[SaleLineRead]


UserRole = Literal["admin", "manager", "cashier"]


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=1, max_length=256)


class UserRead(ORMModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=12, max_length=256)
    role: UserRole = "cashier"


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    password: str | None = Field(default=None, min_length=12, max_length=256)
    role: UserRole | None = None
    is_active: bool | None = None


class AuthSessionRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead


class DashboardTopMedicine(BaseModel):
    medicine_id: int
    name: str
    quantity_sold: int
    revenue: Decimal


class DashboardExpiryBatch(BaseModel):
    batch_id: int
    medicine_name: str
    batch_number: str
    expiry_date: date
    days_to_expiry: int
    quantity_remaining: int
    unit_label: str


class DashboardRecentSale(BaseModel):
    id: int
    receipt_number: str
    customer_name: str | None
    total: Decimal
    payment_method: str
    created_at: datetime


class DashboardSummary(BaseModel):
    today_sales_total: Decimal
    today_sales_count: int
    active_medicines_count: int
    low_stock_count: int
    near_expiry_count: int
    top_medicines: list[DashboardTopMedicine]
    near_expiry_batches: list[DashboardExpiryBatch]
    recent_sales: list[DashboardRecentSale]