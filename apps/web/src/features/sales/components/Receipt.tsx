import { Printer, X } from "lucide-react";
import type { Sale } from "@pharmacy/contracts";
import { formatLocalDateTime, formatPKR } from "../../../shared/format";
import { Modal } from "../../../shared/components/Modal";

type ReceiptProps = { sale: Sale; onClose: () => void };

export function Receipt({ sale, onClose }: ReceiptProps) {
  return (
    <Modal title="Sale receipt" onClose={onClose}>
      <div className="receipt-tools">
        <button
          className="button button-primary"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          Print receipt
        </button>
        <button className="button button-quiet" onClick={onClose}>
          <X size={16} />
          Close
        </button>
      </div>
      <article className="receipt-paper" id="print-receipt">
        <header className="receipt-brand">
          <strong>PHARMACY DESK</strong>
          <span>Medical store receipt</span>
        </header>
        <div className="receipt-meta">
          <span>Receipt</span>
          <strong>{sale.receipt_number}</strong>
          <span>Date</span>
          <strong>{formatLocalDateTime(sale.created_at)}</strong>
          {sale.customer_name && (
            <>
              <span>Customer</span>
              <strong>{sale.customer_name}</strong>
            </>
          )}
          {sale.customer_phone && (
            <>
              <span>Phone</span>
              <strong>{sale.customer_phone}</strong>
            </>
          )}
        </div>
        <table className="receipt-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((line) => (
              <tr key={line.id}>
                <td>
                  <strong>{line.medicine_name}</strong>
                  <small>
                    Batch {line.batch_number} · Exp {line.expiry_date}
                  </small>
                  <small>{formatPKR(line.unit_price)} each</small>
                </td>
                <td>{line.quantity}</td>
                <td>{formatPKR(line.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="receipt-totals">
          <div>
            <span>Subtotal</span>
            <strong>{formatPKR(sale.subtotal)}</strong>
          </div>
          {Number(sale.discount_amount) > 0 && (
            <div>
              <span>Discount</span>
              <strong>-{formatPKR(sale.discount_amount)}</strong>
            </div>
          )}
          <div className="receipt-grand-total">
            <span>Total paid</span>
            <strong>{formatPKR(sale.total)}</strong>
          </div>
        </div>
        <footer className="receipt-footer">
          <span>Payment: {sale.payment_method.replace("_", " ")}</span>
          <span>Thank you</span>
          <small>Prices shown in Pakistani Rupees (PKR)</small>
        </footer>
      </article>
    </Modal>
  );
}
