export type HealthResponse = {
    status: "ok";
    service: string;
};

export type UserRole = "admin" | "manager" | "cashier";

export type User = {
    id: number;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
};

export type LoginInput = { email: string; password: string };

export type AuthSession = {
    access_token: string;
    token_type: "bearer";
    expires_in: number;
    user: User;
};

export type UserCreateInput = {
    email: string;
    full_name: string;
    password: string;
    role: UserRole;
};

export type UserUpdateInput = Partial<{
    full_name: string;
    password: string;
    role: UserRole;
    is_active: boolean;
}>;

export type DashboardTopMedicine = {
    medicine_id: number;
    name: string;
    quantity_sold: number;
    revenue: Money;
};

export type DashboardExpiryBatch = {
    batch_id: number;
    medicine_name: string;
    batch_number: string;
    expiry_date: string;
    days_to_expiry: number;
    quantity_remaining: number;
    unit_label: string;
};

export type DashboardRecentSale = {
    id: number;
    receipt_number: string;
    customer_name: string | null;
    total: Money;
    payment_method: string;
    created_at: string;
};

export type DashboardSummary = {
    today_sales_total: Money;
    today_sales_count: number;
    active_medicines_count: number;
    low_stock_count: number;
    near_expiry_count: number;
    top_medicines: DashboardTopMedicine[];
    near_expiry_batches: DashboardExpiryBatch[];
    recent_sales: DashboardRecentSale[];
};

export type Money = string | number;

export type Medicine = {
    id: number;
    name: string;
    generic_name: string | null;
    brand: string | null;
    strength: string | null;
    dosage_form: string | null;
    unit_label: string;
    barcode: string | null;
    manufacturer: string | null;
    reorder_level: number;
    is_active: boolean;
    available_stock: number;
    sale_price: Money | null;
};

export type MedicineInput = Omit<Medicine, "id" | "is_active" | "available_stock" | "sale_price">;

export type Supplier = {
    id: number;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    is_active: boolean;
};

export type SupplierInput = Omit<Supplier, "id" | "is_active">;

export type MedicineBatch = {
    id: number;
    medicine_id: number;
    supplier_id: number | null;
    batch_number: string;
    expiry_date: string;
    quantity_received: number;
    quantity_remaining: number;
    purchase_price: Money;
    sale_price: Money;
    supplier_invoice: string | null;
    supplier_name: string | null;
};

export type MedicineBatchInput = Omit<
    MedicineBatch,
    | "id"
    | "medicine_id"
    | "quantity_received"
    | "quantity_remaining"
    | "supplier_name"
> & { quantity: number };

export type SaleLine = {
    id: number;
    medicine_id: number;
    medicine_name: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    unit_price: Money;
    line_total: Money;
};

export type Sale = {
    id: number;
    receipt_number: string;
    customer_name: string | null;
    customer_phone: string | null;
    payment_method: "cash" | "card" | "mobile_wallet";
    subtotal: Money;
    discount_amount: Money;
    total: Money;
    created_at: string;
    lines: SaleLine[];
};

export type SaleInput = {
    customer_name?: string | null;
    customer_phone?: string | null;
    payment_method: Sale["payment_method"];
    discount_amount: Money;
    lines: Array<{ medicine_id: number; quantity: number }>;
};