from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import Medicine, MedicineBatch, Sale, SaleLine, Supplier, User
from app.schemas import (
    BatchCreate,
    BatchRead,
    MedicineCreate,
    MedicineRead,
    MedicineUpdate,
    SaleCreate,
    SaleRead,
    SupplierCreate,
    SupplierRead,
    SupplierUpdate,
)
from app.security import get_current_user, require_roles


router = APIRouter(prefix="/api/v1", dependencies=[Depends(get_current_user)])
KARACHI = ZoneInfo("Asia/Karachi")
manager_or_admin = require_roles("admin", "manager")


def _medicine_query(db: Session, medicine_id: int) -> Medicine:
    medicine = db.scalar(
        select(Medicine)
        .options(selectinload(Medicine.batches))
        .where(Medicine.id == medicine_id, Medicine.is_active.is_(True))
    )
    if medicine is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine


def _medicine_payload(medicine: Medicine) -> dict[str, object]:
    today = datetime.now(KARACHI).date()
    sellable_batches = sorted(
        (
            batch
            for batch in medicine.batches
            if batch.expiry_date >= today and batch.quantity_remaining > 0
        ),
        key=lambda batch: (batch.expiry_date, batch.id),
    )
    available_stock = sum(batch.quantity_remaining for batch in sellable_batches)
    return {
        "id": medicine.id,
        "name": medicine.name,
        "generic_name": medicine.generic_name,
        "brand": medicine.brand,
        "strength": medicine.strength,
        "dosage_form": medicine.dosage_form,
        "unit_label": medicine.unit_label,
        "barcode": medicine.barcode,
        "manufacturer": medicine.manufacturer,
        "reorder_level": medicine.reorder_level,
        "is_active": medicine.is_active,
        "available_stock": available_stock,
        "sale_price": sellable_batches[0].sale_price if sellable_batches else None,
    }


@router.get("/medicines", response_model=list[MedicineRead])
def list_medicines(
    search: str | None = None,
    include_inactive: bool = False,
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[dict[str, object]]:
    query = select(Medicine).options(selectinload(Medicine.batches)).order_by(Medicine.name).limit(limit)
    if not include_inactive:
        query = query.where(Medicine.is_active.is_(True))
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Medicine.name.ilike(term),
                Medicine.generic_name.ilike(term),
                Medicine.brand.ilike(term),
                Medicine.barcode.ilike(term),
            )
        )
    return [_medicine_payload(medicine) for medicine in db.scalars(query).all()]


@router.post("/medicines", response_model=MedicineRead, status_code=status.HTTP_201_CREATED)
def create_medicine(
    payload: MedicineCreate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> dict[str, object]:
    medicine = Medicine(**payload.model_dump())
    db.add(medicine)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="That barcode is already in use") from error
    db.refresh(medicine)
    return _medicine_payload(medicine)


@router.patch("/medicines/{medicine_id}", response_model=MedicineRead)
def update_medicine(
    medicine_id: int,
    payload: MedicineUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> dict[str, object]:
    medicine = _medicine_query(db, medicine_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(medicine, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="That barcode is already in use") from error
    return _medicine_payload(_medicine_query(db, medicine_id))


@router.delete("/medicines/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_medicine(
    medicine_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> Response:
    medicine = db.get(Medicine, medicine_id)
    if medicine is None or not medicine.is_active:
        raise HTTPException(status_code=404, detail="Medicine not found")
    medicine.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/medicines/{medicine_id}/batches", response_model=list[BatchRead])
def list_medicine_batches(medicine_id: int, db: Session = Depends(get_db)) -> list[MedicineBatch]:
    _medicine_query(db, medicine_id)
    query = (
        select(MedicineBatch)
        .options(joinedload(MedicineBatch.supplier))
        .where(MedicineBatch.medicine_id == medicine_id)
        .order_by(MedicineBatch.expiry_date, MedicineBatch.id)
    )
    return list(db.scalars(query).all())


@router.post(
    "/medicines/{medicine_id}/batches",
    response_model=BatchRead,
    status_code=status.HTTP_201_CREATED,
)
def receive_batch(
    medicine_id: int,
    payload: BatchCreate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> MedicineBatch:
    _medicine_query(db, medicine_id)
    if payload.expiry_date < datetime.now(KARACHI).date():
        raise HTTPException(status_code=422, detail="Cannot receive an already expired batch")
    if payload.supplier_id is not None:
        supplier = db.get(Supplier, payload.supplier_id)
        if supplier is None or not supplier.is_active:
            raise HTTPException(status_code=404, detail="Supplier not found")
    batch = MedicineBatch(
        medicine_id=medicine_id,
        quantity_received=payload.quantity,
        quantity_remaining=payload.quantity,
        **payload.model_dump(exclude={"quantity"}),
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/suppliers", response_model=list[SupplierRead])
def list_suppliers(
    search: str | None = None,
    include_inactive: bool = False,
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[Supplier]:
    query = select(Supplier).order_by(Supplier.name).limit(limit)
    if not include_inactive:
        query = query.where(Supplier.is_active.is_(True))
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(Supplier.name.ilike(term), Supplier.contact_person.ilike(term), Supplier.phone.ilike(term))
        )
    return list(db.scalars(query).all())


@router.post("/suppliers", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> Supplier:
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.patch("/suppliers/{supplier_id}", response_model=SupplierRead)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> Supplier:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None or not supplier.is_active:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    return supplier


@router.delete("/suppliers/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> Response:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None or not supplier.is_active:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/sales", response_model=list[SaleRead])
def list_sales(
    limit: int = Query(default=100, ge=1, le=200), db: Session = Depends(get_db)
) -> list[Sale]:
    query = (
        select(Sale)
        .options(joinedload(Sale.lines).joinedload(SaleLine.medicine), joinedload(Sale.lines).joinedload(SaleLine.batch))
        .order_by(Sale.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(query).unique().all())


@router.get("/sales/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: int, db: Session = Depends(get_db)) -> Sale:
    query = (
        select(Sale)
        .options(joinedload(Sale.lines).joinedload(SaleLine.medicine), joinedload(Sale.lines).joinedload(SaleLine.batch))
        .where(Sale.id == sale_id)
    )
    sale = db.scalars(query).unique().one_or_none()
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale


@router.post("/sales", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)) -> Sale:
    sale = Sale(
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        payment_method=payload.payment_method,
        subtotal=Decimal("0.00"),
        discount_amount=payload.discount_amount,
        total=Decimal("0.00"),
    )
    db.add(sale)
    db.flush()

    subtotal = Decimal("0.00")
    today = datetime.now(KARACHI).date()
    for requested_line in payload.lines:
        medicine = db.get(Medicine, requested_line.medicine_id)
        if medicine is None or not medicine.is_active:
            db.rollback()
            raise HTTPException(status_code=404, detail="A selected medicine was not found")

        batch_query = (
            select(MedicineBatch)
            .where(
                MedicineBatch.medicine_id == medicine.id,
                MedicineBatch.expiry_date >= today,
                MedicineBatch.quantity_remaining > 0,
            )
            .order_by(MedicineBatch.expiry_date, MedicineBatch.id)
            .with_for_update()
        )
        remaining = requested_line.quantity
        for batch in db.scalars(batch_query).all():
            quantity = min(remaining, batch.quantity_remaining)
            line_total = (batch.sale_price * quantity).quantize(Decimal("0.01"))
            batch.quantity_remaining -= quantity
            sale.lines.append(
                SaleLine(
                    medicine_id=medicine.id,
                    batch_id=batch.id,
                    quantity=quantity,
                    unit_price=batch.sale_price,
                    line_total=line_total,
                )
            )
            subtotal += line_total
            remaining -= quantity
            if remaining == 0:
                break
        if remaining > 0:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=f"Not enough unexpired stock for {medicine.name}",
            )

    if payload.discount_amount > subtotal:
        db.rollback()
        raise HTTPException(status_code=422, detail="Discount cannot exceed the sale subtotal")

    sale.subtotal = subtotal
    sale.total = subtotal - payload.discount_amount
    local_now = datetime.now(KARACHI)
    sale.receipt_number = f"PS-{local_now:%Y%m%d}-{sale.id:06d}"
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Could not create this sale") from error
    return get_sale(sale.id, db)