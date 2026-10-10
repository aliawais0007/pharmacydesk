from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Medicine, MedicineBatch, Sale, SaleLine
from app.schemas import (
    DashboardExpiryBatch,
    DashboardRecentSale,
    DashboardSummary,
    DashboardTopMedicine,
)
from app.security import get_current_user


router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)
KARACHI = ZoneInfo("Asia/Karachi")


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    now = datetime.now(KARACHI)
    today = now.date()
    day_start = datetime.combine(today, time.min, tzinfo=KARACHI).astimezone(timezone.utc)
    next_day = datetime.combine(today + timedelta(days=1), time.min, tzinfo=KARACHI).astimezone(timezone.utc)

    today_sales = db.execute(
        select(func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.created_at >= day_start,
            Sale.created_at < next_day,
        )
    ).one()

    active_medicines = db.scalar(
        select(func.count(Medicine.id)).where(Medicine.is_active.is_(True))
    ) or 0

    stock_by_medicine = (
        select(
            MedicineBatch.medicine_id.label("medicine_id"),
            func.sum(MedicineBatch.quantity_remaining).label("available_stock"),
        )
        .where(
            MedicineBatch.expiry_date >= today,
            MedicineBatch.quantity_remaining > 0,
        )
        .group_by(MedicineBatch.medicine_id)
        .subquery()
    )
    low_stock_count = db.scalar(
        select(func.count(Medicine.id))
        .outerjoin(stock_by_medicine, stock_by_medicine.c.medicine_id == Medicine.id)
        .where(
            Medicine.is_active.is_(True),
            Medicine.reorder_level > 0,
            func.coalesce(stock_by_medicine.c.available_stock, 0) <= Medicine.reorder_level,
        )
    ) or 0

    expiry_cutoff = today + timedelta(days=90)
    near_expiry_count = db.scalar(
        select(func.count(MedicineBatch.id))
        .join(MedicineBatch.medicine)
        .where(
            Medicine.is_active.is_(True),
            MedicineBatch.expiry_date >= today,
            MedicineBatch.expiry_date <= expiry_cutoff,
            MedicineBatch.quantity_remaining > 0,
        )
    ) or 0
    expiry_rows = db.scalars(
        select(MedicineBatch)
        .options(joinedload(MedicineBatch.medicine))
        .join(MedicineBatch.medicine)
        .where(
            Medicine.is_active.is_(True),
            MedicineBatch.expiry_date >= today,
            MedicineBatch.expiry_date <= expiry_cutoff,
            MedicineBatch.quantity_remaining > 0,
        )
        .order_by(MedicineBatch.expiry_date, MedicineBatch.id)
        .limit(10)
    ).all()
    near_expiry_batches = [
        DashboardExpiryBatch(
            batch_id=batch.id,
            medicine_name=batch.medicine.name,
            batch_number=batch.batch_number,
            expiry_date=batch.expiry_date,
            days_to_expiry=(batch.expiry_date - today).days,
            quantity_remaining=batch.quantity_remaining,
            unit_label=batch.medicine.unit_label,
        )
        for batch in expiry_rows
    ]

    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    top_rows = db.execute(
        select(
            SaleLine.medicine_id,
            Medicine.name,
            func.sum(SaleLine.quantity).label("quantity_sold"),
            func.sum(SaleLine.line_total).label("revenue"),
        )
        .join(SaleLine.sale)
        .join(SaleLine.medicine)
        .where(Sale.created_at >= month_ago)
        .group_by(SaleLine.medicine_id, Medicine.name)
        .order_by(func.sum(SaleLine.quantity).desc(), func.sum(SaleLine.line_total).desc())
        .limit(5)
    ).all()
    top_medicines = [
        DashboardTopMedicine(
            medicine_id=row.medicine_id,
            name=row.name,
            quantity_sold=row.quantity_sold,
            revenue=row.revenue,
        )
        for row in top_rows
    ]

    recent_sales = db.scalars(
        select(Sale).order_by(Sale.created_at.desc(), Sale.id.desc()).limit(8)
    ).all()

    return DashboardSummary(
        today_sales_total=today_sales[1],
        today_sales_count=today_sales[0],
        active_medicines_count=active_medicines,
        low_stock_count=low_stock_count,
        near_expiry_count=near_expiry_count,
        top_medicines=top_medicines,
        near_expiry_batches=near_expiry_batches,
        recent_sales=[
            DashboardRecentSale(
                id=sale.id,
                receipt_number=sale.receipt_number or "",
                customer_name=sale.customer_name,
                total=sale.total,
                payment_method=sale.payment_method,
                created_at=sale.created_at,
            )
            for sale in recent_sales
        ],
    )