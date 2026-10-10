import type { FormEvent } from "react";
import type { Supplier, SupplierInput } from "@pharmacy/contracts";
import { Modal } from "../../../shared/components/Modal";

type SupplierFormProps = {
  supplier?: Supplier;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (input: SupplierInput) => void;
};

export function SupplierForm({
  supplier,
  busy,
  error,
  onClose,
  onSave,
}: SupplierFormProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      name: String(form.get("name")).trim(),
      contact_person: String(form.get("contact_person")).trim() || null,
      phone: String(form.get("phone")).trim() || null,
      email: String(form.get("email")).trim() || null,
      address: String(form.get("address")).trim() || null,
      notes: String(form.get("notes")).trim() || null,
    });
  }

  return (
    <Modal
      title={supplier ? "Edit supplier" : "Add supplier"}
      onClose={onClose}
    >
      <form className="form-body" onSubmit={submit}>
        <label className="field">
          <span>Supplier / distributor name *</span>
          <input
            name="name"
            required
            autoFocus
            defaultValue={supplier?.name ?? ""}
          />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>Contact person</span>
            <input
              name="contact_person"
              defaultValue={supplier?.contact_person ?? ""}
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input
              name="phone"
              inputMode="tel"
              placeholder="03xx xxxxxxx"
              defaultValue={supplier?.phone ?? ""}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              defaultValue={supplier?.email ?? ""}
            />
          </label>
          <label className="field">
            <span>Address</span>
            <input name="address" defaultValue={supplier?.address ?? ""} />
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <textarea
            name="notes"
            rows={3}
            defaultValue={supplier?.notes ?? ""}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving..." : supplier ? "Save changes" : "Add supplier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
