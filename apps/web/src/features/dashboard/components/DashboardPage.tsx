import { AlertTriangle, ArrowRight, Banknote, Boxes, Clock3, PackageSearch, ReceiptText, RefreshCw, TrendingUp } from "lucide-react";
import { PageHeading } from "../../../shared/components/PageHeading";
import { formatLocalDate, formatLocalDateTime, formatPKR } from "../../../shared/format";
import { useAppStore } from "../../../shared/store/useAppStore";
import { useDashboard } from "../hooks/useDashboard";

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard();
  const setActiveView = useAppStore((state) => state.setActiveView);

  return (
    <section className="feature-page dashboard-page">
      <PageHeading
        eyebrow="TODAY AT THE COUNTER"
        title="Dashboard"
        description="A live view of sales, stock health, and expiry dates."
        action={<button className="button button-quiet" onClick={() => void refetch()} disabled={isFetching}><RefreshCw size={15} className={isFetching ? "spin-icon" : ""} />Refresh</button>}
      />
      {isError && <p className="inline-error">{error.message}</p>}
      <div className="dashboard-stats">
        <article className="stat-tile stat-sales"><span className="stat-icon"><Banknote size={18} /></span><span className="stat-label">SALES TODAY</span><strong>{isLoading ? "—" : formatPKR(data?.today_sales_total ?? 0)}</strong><small>{data?.today_sales_count ?? 0} completed receipts</small></article>
        <article className="stat-tile stat-stock"><span className="stat-icon"><Boxes size={18} /></span><span className="stat-label">ACTIVE MEDICINES</span><strong>{isLoading ? "—" : data?.active_medicines_count ?? 0}</strong><small>In the medicine catalogue</small></article>
        <article className={`stat-tile ${data?.low_stock_count ? "stat-warning" : "stat-safe"}`}><span className="stat-icon"><PackageSearch size={18} /></span><span className="stat-label">LOW STOCK</span><strong>{isLoading ? "—" : data?.low_stock_count ?? 0}</strong><small>At or below reorder level</small></article>
        <article className={`stat-tile ${data?.near_expiry_count ? "stat-expiry" : "stat-safe"}`}><span className="stat-icon"><Clock3 size={18} /></span><span className="stat-label">EXPIRING · 90 DAYS</span><strong>{isLoading ? "—" : data?.near_expiry_count ?? 0}</strong><small>Unexpired batches to review</small></article>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel top-sellers-panel">
          <header className="dashboard-panel-header"><div><span className="panel-icon teal-icon"><TrendingUp size={17} /></span><div><h2>Top medicines</h2><p>By units sold · last 30 days</p></div></div><button className="text-action" onClick={() => setActiveView("medicines")}>Catalogue <ArrowRight size={14} /></button></header>
          {isLoading ? <p className="dashboard-empty">Loading sales summary...</p> : !data?.top_medicines.length ? <p className="dashboard-empty">Completed sales will build this list.</p> : <div className="top-seller-list">{data.top_medicines.map((medicine, index) => {
            const max = Math.max(...data.top_medicines.map((item) => item.quantity_sold), 1);
            return <div className="top-seller-row" key={medicine.medicine_id}><span className="seller-rank">{String(index + 1).padStart(2, "0")}</span><div className="seller-info"><div className="seller-heading"><strong>{medicine.name}</strong><span>{medicine.quantity_sold} sold</span></div><div className="seller-bar"><span style={{ width: `${(medicine.quantity_sold / max) * 100}%` }} /></div></div><strong className="seller-revenue">{formatPKR(medicine.revenue)}</strong></div>;
          })}</div>}
        </section>

        <section className="dashboard-panel expiry-panel">
          <header className="dashboard-panel-header"><div><span className="panel-icon coral-icon"><AlertTriangle size={17} /></span><div><h2>Expiry watch</h2><p>Unexpired stock · next 90 days</p></div></div><button className="text-action" onClick={() => setActiveView("medicines")}>Stock <ArrowRight size={14} /></button></header>
          {isLoading ? <p className="dashboard-empty">Loading expiry dates...</p> : !data?.near_expiry_batches.length ? <p className="dashboard-empty">No batches due in the next 90 days.</p> : <div className="expiry-list">{data.near_expiry_batches.map((batch) => <div className="expiry-row" key={batch.batch_id}><span className={`expiry-marker ${batch.days_to_expiry <= 30 ? "expiry-urgent" : ""}`} /><div className="expiry-medicine"><strong>{batch.medicine_name}</strong><small>Batch {batch.batch_number} · {batch.quantity_remaining} {batch.unit_label}</small></div><div className="expiry-date"><strong>{batch.days_to_expiry}d</strong><small>{formatLocalDate(batch.expiry_date)}</small></div></div>)}</div>}
        </section>
      </div>

      <section className="dashboard-panel dashboard-recent-panel">
        <header className="dashboard-panel-header"><div><span className="panel-icon night-icon"><ReceiptText size={17} /></span><div><h2>Recent sales</h2><p>Latest completed receipts</p></div></div><button className="text-action" onClick={() => setActiveView("sales")}>Point of sale <ArrowRight size={14} /></button></header>
        <div className="data-table-wrap dashboard-sales-table"><table className="data-table"><thead><tr><th>Receipt</th><th>Time</th><th>Customer</th><th>Payment</th><th>Total</th></tr></thead><tbody>
          {isLoading ? <tr><td colSpan={5} className="table-message">Loading recent sales...</td></tr> : !data?.recent_sales.length ? <tr><td colSpan={5} className="table-message">Completed receipts will appear here.</td></tr> : data.recent_sales.map((sale) => <tr key={sale.id}><td className="cell-strong mono-cell">{sale.receipt_number}</td><td>{formatLocalDateTime(sale.created_at)}</td><td>{sale.customer_name || "Walk-in"}</td><td className="capitalize">{sale.payment_method.replace("_", " ")}</td><td className="cell-strong">{formatPKR(sale.total)}</td></tr>)}
        </tbody></table></div>
      </section>
    </section>
  );
}