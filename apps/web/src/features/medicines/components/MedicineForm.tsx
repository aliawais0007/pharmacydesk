import { useState } from "react";
import type { FormEvent } from "react";
import type { Medicine, MedicineInput } from "@pharmacy/contracts";
import { Modal } from "../../../shared/components/Modal";

type MedicineFormProps = {
  medicine?: Medicine;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (input: MedicineInput) => void;
};

const emptyMedicine: MedicineInput = {
  name: "",
  generic_name: "",
  brand: "",
  strength: "",
  dosage_form: "",
  unit_label: "pack",
  barcode: "",
  manufacturer: "",
  reorder_level: 0,
};

export function MedicineForm({
  medicine,
  busy,
  error,
  onClose,
  onSave,
}: MedicineFormProps) {
  const [form, setForm] = useState<MedicineInput>(
    medicine
      ? {
          name: medicine.name,
          generic_name: medicine.generic_name ?? "",
          brand: medicine.brand ?? "",
          strength: medicine.strength ?? "",
          dosage_form: medicine.dosage_form ?? "",
          unit_label: medicine.unit_label,
          barcode: medicine.barcode ?? "",
          manufacturer: medicine.manufacturer ?? "",
          reorder_level: medicine.reorder_level,
        }
      : emptyMedicine,
  );

  function setField<K extends keyof MedicineInput>(
    key: K,
    value: MedicineInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      ...form,
      name: form.name.trim(),
      generic_name: form.generic_name?.trim() || null,
      brand: form.brand?.trim() || null,
      strength: form.strength?.trim() || null,
      dosage_form: form.dosage_form?.trim() || null,
      barcode: form.barcode?.trim() || null,
      manufacturer: form.manufacturer?.trim() || null,
      unit_label: form.unit_label.trim(),
      reorder_level: Number(form.reorder_level),
    });
  }

  return (
    <Modal
      title={medicine ? "Edit medicine" : "Add medicine"}
      onClose={onClose}
    >
      <form className="form-body" onSubmit={submit}>
        <label className="field">
          <span>Medicine name *</span>
          <input
            required
            autoFocus
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
          />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>Generic name</span>
            <input
              value={form.generic_name ?? ""}
              onChange={(event) => setField("generic_name", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Brand</span>
            <input
              value={form.brand ?? ""}
              onChange={(event) => setField("brand", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Strength</span>
            <input
              placeholder="e.g. 500 mg"
              value={form.strength ?? ""}
              onChange={(event) => setField("strength", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Dosage form</span>
            <input
              placeholder="Tablet, syrup, capsule"
              value={form.dosage_form ?? ""}
              onChange={(event) => setField("dosage_form", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Sold as</span>
            <input
              required
              value={form.unit_label}
              onChange={(event) => setField("unit_label", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Barcode</span>
            <input
              value={form.barcode ?? ""}
              onChange={(event) => setField("barcode", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Manufacturer</span>
            <input
              value={form.manufacturer ?? ""}
              onChange={(event) => setField("manufacturer", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Low-stock alert at</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.reorder_level}
              onChange={(event) =>
                setField("reorder_level", Number(event.target.value))
              }
            />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={busy}
          >
            {busy ? "Saving..." : medicine ? "Save changes" : "Add medicine"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
