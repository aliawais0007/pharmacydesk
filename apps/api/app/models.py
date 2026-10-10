from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    generic_name: Mapped[str | None] = mapped_column(String(160))
    brand: Mapped[str | None] = mapped_column(String(120))
    strength: Mapped[str | None] = mapped_column(String(80))
    dosage_form: Mapped[str | None] = mapped_column(String(80))
    unit_label: Mapped[str] = mapped_column(String(40), default="pack")
    barcode: Mapped[str | None] = mapped_column(String(80), unique=True, index=True)
    manufacturer: Mapped[str | None] = mapped_column(String(160))
    reorder_level: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    batches: Mapped[list["MedicineBatch"]] = relationship(back_populates="medicine")


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    contact_person: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40))
    email: Mapped[str | None] = mapped_column(String(160))
    address: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    batches: Mapped[list["MedicineBatch"]] = relationship(back_populates="supplier")


class MedicineBatch(Base):
    __tablename__ = "medicine_batches"
    __table_args__ = (
        CheckConstraint("quantity_received > 0", name="ck_batch_received_positive"),
        CheckConstraint("quantity_remaining >= 0", name="ck_batch_remaining_nonnegative"),
        CheckConstraint("purchase_price >= 0", name="ck_batch_purchase_price_nonnegative"),
        CheckConstraint("sale_price >= 0", name="ck_batch_sale_price_nonnegative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id", ondelete="RESTRICT"), index=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True)
    batch_number: Mapped[str] = mapped_column(String(100), index=True)
    expiry_date: Mapped[date] = mapped_column(Date, index=True)
    quantity_received: Mapped[int] = mapped_column(Integer)
    quantity_remaining: Mapped[int] = mapped_column(Integer)
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    sale_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    supplier_invoice: Mapped[str | None] = mapped_column(String(100))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    medicine: Mapped[Medicine] = relationship(back_populates="batches")
    supplier: Mapped[Supplier | None] = relationship(back_populates="batches")
    sale_lines: Mapped[list["SaleLine"]] = relationship(back_populates="batch")

    @property
    def supplier_name(self) -> str | None:
        return self.supplier.name if self.supplier else None


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_sale_subtotal_nonnegative"),
        CheckConstraint("discount_amount >= 0", name="ck_sale_discount_nonnegative"),
        CheckConstraint("total >= 0", name="ck_sale_total_nonnegative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    receipt_number: Mapped[str | None] = mapped_column(String(40), unique=True, index=True)
    customer_name: Mapped[str | None] = mapped_column(String(160))
    customer_phone: Mapped[str | None] = mapped_column(String(40))
    payment_method: Mapped[str] = mapped_column(String(24), default="cash")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    lines: Mapped[list["SaleLine"]] = relationship(back_populates="sale", cascade="all, delete-orphan")


class SaleLine(Base):
    __tablename__ = "sale_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sale_line_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_sale_line_price_nonnegative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="RESTRICT"), index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id", ondelete="RESTRICT"), index=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("medicine_batches.id", ondelete="RESTRICT"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    sale: Mapped[Sale] = relationship(back_populates="lines")
    medicine: Mapped[Medicine] = relationship()
    batch: Mapped[MedicineBatch] = relationship(back_populates="sale_lines")

    @property
    def medicine_name(self) -> str:
        return self.medicine.name

    @property
    def batch_number(self) -> str:
        return self.batch.batch_number

    @property
    def expiry_date(self) -> date:
        return self.batch.expiry_date


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('admin', 'manager', 'cashier')", name="ck_user_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(String(512))
    role: Mapped[str] = mapped_column(String(20), default="cashier", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    absolute_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    user_agent: Mapped[str | None] = mapped_column(String(300))

    user: Mapped[User] = relationship(back_populates="sessions")