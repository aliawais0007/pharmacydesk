import { useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Medicine, MedicineBatchInput } from "@pharmacy/contracts";
import { useSuppliers } from "../../suppliers/hooks/useSuppliers";
import { formatLocalDate, formatPKR } from "../../../shared/format";
import { Modal } from "../../../shared/components/Modal";
import { useMedicineActions, useMedicineBatches } from "../hooks/useMedicines";

type BatchDialogProps = { medicine: Medicine; onClose: () => void };

export function BatchDialog({ medicine, onClose }: BatchDialogProps) {
  const { data: batches = [], isLoading } = useMedicineBatches(medicine.id);
  const { data: suppliers = [] } = useSuppliers();
  const { receiveBatch } = useMedicineActions();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: MedicineBatchInput = {
      supplier_id: form.get("supplier_id")
        ? Number(form.get("supplier_id"))
        : null,
      batch_number: String(form.get("batch_number")).trim(),
      expiry_date: String(form.get("expiry_date")),
      quantity: Number(form.get("quantity")),
      purchase_price: String(form.get("purchase_price")),
      sale_price: String(form.get("sale_price")),
      supplier_invoice: String(form.get("supplier_invoice")).trim() || null,
    };
    setError("");
    receiveBatch.mutate(
      { medicineId: medicine.id, input },
      {
        onSuccess: () => setShowForm(false),
        onError: (cause) => setError(cause.message),
      },
    );
  }

  return (
    <Modal title={`${medicine.name} · batches`} onClose={onClose} size="wide">
      <div className="dialog-content">
        <div className="dialog-toolbar">
          <p className="muted-copy">
            Stock is held by batch. Sales use the earliest-expiring available
            batch first.
          </p>
          <button
            className="button button-primary"
            type="button"
            onClick={() => setShowForm((value) => !value)}
          >
            <Plus size={16} />
            Receive stock
          </button>
        </div>
        {showForm && (
          <form className="batch-form" onSubmit={submit}>
            <label className="field">
              <span>Batch number *</span>
              <input name="batch_number" required />
            </label>
            <label className="field">
              <span>Expiry *</span>
              <input name="expiry_date" type="date" required />
            </label>
            <label className="field">
              <span>Quantity *</span>
              <input name="quantity" type="number" min="1" step="1" required />
            </label>
            <label className="field">
              <span>Purchase price (PKR) *</span>
              <input
                name="purchase_price"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </label>
            <label className="field">
              <span>Sale price (PKR) *</span>
              <input
                name="sale_price"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </label>
            <label className="field">
              <span>Supplier</span>
              <select name="supplier_id">
                <option value="">Not selected</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Supplier invoice</span>
              <input name="supplier_invoice" />
            </label>
            <div className="batch-form-actions">
              <button
                className="button button-primary"
                disabled={receiveBatch.isPending}
              >
                {receiveBatch.isPending ? "Saving..." : "Add batch"}
              </button>
            </div>
            {error && <p className="form-error">{error}</p>}
          </form>
        )}
        {isLoading ? (
          <p className="empty-state">Loading batches...</p>
        ) : batches.length === 0 ? (
          <p className="empty-state">
            No stock batches yet. Receive the first batch above.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>In stock</th>
                  <th>Purchase</th>
                  <th>Sale</th>
                  <th>Supplier</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="cell-strong">{batch.batch_number}</td>
                    <td>{formatLocalDate(batch.expiry_date)}</td>
                    <td>
                      {batch.quantity_remaining} {medicine.unit_label}
                    </td>
                    <td>{formatPKR(batch.purchase_price)}</td>
                    <td>{formatPKR(batch.sale_price)}</td>
                    <td>{batch.supplier_name ?? "—"}</td>
                    <td>{batch.supplier_invoice ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
