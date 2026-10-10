import { useMemo, useState } from "react";
import { useDeferredValue } from "react";
import { Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import type { Sale, SaleInput } from "@pharmacy/contracts";
import { PageHeading } from "../../../shared/components/PageHeading";
import { formatLocalDateTime, formatPKR } from "../../../shared/format";
import { useMedicines } from "../../medicines/hooks/useMedicines";
import { useCreateSale, useSales } from "../hooks/useSales";
import { useSaleCartStore } from "../store/useSaleCartStore";
import { Receipt } from "./Receipt";

export function SalesPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<SaleInput["payment_method"]>("cash");
  const [discount, setDiscount] = useState("0");
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const cart = useSaleCartStore();
  const { data: medicines = [], isLoading: medicinesLoading } =
    useMedicines(deferredSearch);
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const createSale = useCreateSale();
  const cartSubtotal = useMemo(
    () =>
      cart.items.reduce((total, item) => {
        return total + Number(item.medicine.sale_price ?? 0) * item.quantity;
      }, 0),
    [cart.items],
  );

  function checkout() {
    const input: SaleInput = {
      customer_name: customerName.trim() || null,
      customer_phone: customerPhone.trim() || null,
      payment_method: paymentMethod,
      discount_amount: discount || "0",
      lines: cart.items.map(({ medicine, quantity }) => ({
        medicine_id: medicine.id,
        quantity,
      })),
    };
    createSale.mutate(input, {
      onSuccess: (sale) => {
        cart.clear();
        setCustomerName("");
        setCustomerPhone("");
        setDiscount("0");
        setReceipt(sale);
      },
    });
  }

  return (
    <section className="feature-page sales-page">
      <PageHeading
        eyebrow="COUNTER"
        title="Point of sale"
        description="Scan or search a medicine, add quantities, and print the receipt."
      />
      <div className="pos-layout">
        <section className="pos-catalog">
          <label className="search-box pos-search">
            <Search size={18} />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Scan barcode or search medicine"
              aria-label="Scan barcode or search medicine"
            />
          </label>
          <div className="catalog-label">
            <span>
              {deferredSearch ? "MATCHING MEDICINES" : "AVAILABLE STOCK"}
            </span>
            <span>PRICE FROM NEXT BATCH</span>
          </div>
          <div className="medicine-pick-list">
            {medicinesLoading ? (
              <p className="table-message">Searching catalogue...</p>
            ) : medicines.filter((medicine) => medicine.available_stock > 0)
                .length === 0 ? (
              <p className="empty-state">
                {deferredSearch
                  ? "No in-stock medicine matches that search."
                  : "Add medicine and receive stock to begin a sale."}
              </p>
            ) : (
              medicines
                .filter((medicine) => medicine.available_stock > 0)
                .map((medicine) => (
                  <button
                    className="medicine-pick"
                    key={medicine.id}
                    onClick={() => cart.add(medicine)}
                    disabled={medicine.sale_price === null}
                  >
                    <span className="medicine-pick-info">
                      <strong>{medicine.name}</strong>
                      <small>
                        {[
                          medicine.strength,
                          medicine.dosage_form,
                          medicine.brand,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          medicine.generic_name ||
                          "Medicine"}
                      </small>
                    </span>
                    <span className="medicine-pick-price">
                      <strong>
                        {medicine.sale_price === null
                          ? "—"
                          : formatPKR(medicine.sale_price)}
                      </strong>
                      <small>
                        {medicine.available_stock} {medicine.unit_label}{" "}
                        available
                      </small>
                    </span>
                    <Plus size={17} />
                  </button>
                ))
            )}
          </div>
        </section>

        <section className="sale-panel">
          <div className="sale-panel-heading">
            <div>
              <ShoppingBag size={18} />
              <h2>Current sale</h2>
            </div>
            <span>{cart.items.length} lines</span>
          </div>
          <div className="cart-lines">
            {cart.items.length === 0 ? (
              <div className="cart-empty">
                <ShoppingBag size={27} />
                <span>Sale is empty</span>
                <small>Search or scan a medicine to add it</small>
              </div>
            ) : (
              cart.items.map(({ medicine, quantity }) => (
                <div className="cart-line" key={medicine.id}>
                  <div className="cart-line-main">
                    <strong>{medicine.name}</strong>
                    <small>
                      {formatPKR(medicine.sale_price ?? 0)} /{" "}
                      {medicine.unit_label}
                    </small>
                  </div>
                  <div className="quantity-control">
                    <button
                      aria-label={`Decrease ${medicine.name} quantity`}
                      onClick={() =>
                        quantity <= 1
                          ? cart.remove(medicine.id)
                          : cart.setQuantity(medicine.id, quantity - 1)
                      }
                    >
                      <Minus size={13} />
                    </button>
                    <span>{quantity}</span>
                    <button
                      aria-label={`Increase ${medicine.name} quantity`}
                      disabled={quantity >= medicine.available_stock}
                      onClick={() =>
                        cart.setQuantity(medicine.id, quantity + 1)
                      }
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <strong className="cart-line-total">
                    {formatPKR(Number(medicine.sale_price ?? 0) * quantity)}
                  </strong>
                  <button
                    className="icon-button danger-icon cart-remove"
                    aria-label={`Remove ${medicine.name}`}
                    onClick={() => cart.remove(medicine.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="sale-fields">
            <div className="field-grid">
              <label className="field">
                <span>
                  Customer name <small>optional</small>
                </span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Walk-in customer"
                />
              </label>
              <label className="field">
                <span>
                  Phone <small>optional</small>
                </span>
                <input
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="03xx xxxxxxx"
                />
              </label>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Payment</span>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value as SaleInput["payment_method"],
                    )
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile_wallet">Mobile wallet</option>
                </select>
              </label>
              <label className="field">
                <span>Discount (PKR)</span>
                <input
                  type="number"
                  min="0"
                  max={cartSubtotal}
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="sale-total">
            <span>Estimated total</span>
            <strong>
              {formatPKR(Math.max(0, cartSubtotal - Number(discount || 0)))}
            </strong>
            <small>
              Final price is calculated from the selected stock batches.
            </small>
          </div>
          {createSale.isError && (
            <p className="inline-error checkout-error">
              {createSale.error.message}
            </p>
          )}
          <button
            className="button button-checkout"
            disabled={
              cart.items.length === 0 ||
              createSale.isPending ||
              Number(discount) > cartSubtotal
            }
            onClick={checkout}
          >
            {createSale.isPending
              ? "Completing sale..."
              : `Complete sale · ${formatPKR(Math.max(0, cartSubtotal - Number(discount || 0)))}`}
          </button>
          <button
            className="clear-cart"
            disabled={cart.items.length === 0 || createSale.isPending}
            onClick={cart.clear}
          >
            Clear sale
          </button>
        </section>
      </div>

      <section className="recent-sales">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TRANSACTIONS</p>
            <h2>Recent sales</h2>
          </div>
          <span className="result-count">Latest 50</span>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {salesLoading ? (
                <tr>
                  <td colSpan={7} className="table-message">
                    Loading sales...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-message">
                    Completed sales and receipts will appear here.
                  </td>
                </tr>
              ) : (
                sales.slice(0, 8).map((sale) => (
                  <tr key={sale.id}>
                    <td className="cell-strong mono-cell">
                      {sale.receipt_number}
                    </td>
                    <td>{formatLocalDateTime(sale.created_at)}</td>
                    <td>{sale.customer_name || "Walk-in"}</td>
                    <td>
                      {sale.lines.reduce((sum, line) => sum + line.quantity, 0)}
                    </td>
                    <td className="capitalize">
                      {sale.payment_method.replace("_", " ")}
                    </td>
                    <td className="cell-strong">{formatPKR(sale.total)}</td>
                    <td className="actions-cell">
                      <button
                        className="button button-small button-quiet"
                        onClick={() => setReceipt(sale)}
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {receipt && <Receipt sale={receipt} onClose={() => setReceipt(null)} />}
    </section>
  );
}
