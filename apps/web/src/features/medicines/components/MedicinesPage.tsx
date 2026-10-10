import { useState } from "react";
import { Archive, Boxes, Edit2, Plus, Search } from "lucide-react";
import type { Medicine, MedicineInput } from "@pharmacy/contracts";
import { Modal } from "../../../shared/components/Modal";
import { PageHeading } from "../../../shared/components/PageHeading";
import { formatPKR } from "../../../shared/format";
import { useMedicineActions, useMedicines } from "../hooks/useMedicines";
import { BatchDialog } from "./BatchDialog";
import { MedicineForm } from "./MedicineForm";

export function MedicinesPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [batchMedicine, setBatchMedicine] = useState<Medicine | null>(null);
  const [error, setError] = useState("");
  const {
    data: medicines = [],
    isLoading,
    isError,
    error: queryError,
  } = useMedicines(search);
  const { create, update, archive } = useMedicineActions();

  function save(input: MedicineInput) {
    setError("");
    const onSuccess = () => {
      setShowForm(false);
      setEditing(null);
    };
    const onError = (cause: Error) => setError(cause.message);
    if (editing)
      update.mutate({ id: editing.id, input }, { onSuccess, onError });
    else create.mutate(input, { onSuccess, onError });
  }

  function archiveMedicine(medicine: Medicine) {
    if (
      window.confirm(
        `Remove ${medicine.name} from the active catalogue? Past sales and batch records will be kept.`,
      )
    ) {
      archive.mutate(medicine.id, {
        onError: (cause) => setError(cause.message),
      });
    }
  }

  return (
    <section className="feature-page">
      <PageHeading
        eyebrow="CATALOGUE"
        title="Medicines"
        description="Manage the medicines available at your counter."
        action={
          <button
            className="button button-primary"
            onClick={() => {
              setEditing(null);
              setError("");
              setShowForm(true);
            }}
          >
            <Plus size={17} />
            Add medicine
          </button>
        }
      />
      <div className="toolbar-row">
        <label className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, brand or barcode"
            aria-label="Search medicines"
          />
        </label>
        <span className="result-count">{medicines.length} medicines</span>
      </div>
      {error && !showForm && <p className="inline-error">{error}</p>}
      {isError && <p className="inline-error">{queryError.message}</p>}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Barcode</th>
              <th>Stock</th>
              <th>Next batch price</th>
              <th className="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="table-message">
                  Loading medicines...
                </td>
              </tr>
            ) : medicines.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-message">
                  No medicines found. Add a medicine to start building your
                  catalogue.
                </td>
              </tr>
            ) : (
              medicines.map((medicine) => (
                <tr key={medicine.id}>
                  <td>
                    <span className="cell-strong">{medicine.name}</span>
                    <span className="cell-secondary">
                      {[medicine.brand, medicine.generic_name]
                        .filter(Boolean)
                        .join(" · ") || "No brand details"}
                    </span>
                  </td>
                  <td>
                    {[medicine.strength, medicine.dosage_form]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="mono-cell">{medicine.barcode || "—"}</td>
                  <td>
                    <span
                      className={`stock-value ${medicine.available_stock <= medicine.reorder_level ? "stock-low" : ""}`}
                    >
                      {medicine.available_stock} {medicine.unit_label}
                    </span>
                    {medicine.available_stock <= medicine.reorder_level && (
                      <span className="cell-secondary">Low stock</span>
                    )}
                  </td>
                  <td>
                    {medicine.sale_price === null ? (
                      <span className="muted-copy">No stock</span>
                    ) : (
                      formatPKR(medicine.sale_price)
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="icon-button"
                      title="Manage stock batches"
                      aria-label={`Manage batches for ${medicine.name}`}
                      onClick={() => setBatchMedicine(medicine)}
                    >
                      <Boxes size={17} />
                    </button>
                    <button
                      className="icon-button"
                      title="Edit medicine"
                      aria-label={`Edit ${medicine.name}`}
                      onClick={() => {
                        setEditing(medicine);
                        setError("");
                        setShowForm(true);
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="icon-button danger-icon"
                      title="Archive medicine"
                      aria-label={`Archive ${medicine.name}`}
                      onClick={() => archiveMedicine(medicine)}
                    >
                      <Archive size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showForm && (
        <MedicineForm
          key={editing?.id ?? "new"}
          medicine={editing ?? undefined}
          busy={create.isPending || update.isPending}
          error={error}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={save}
        />
      )}
      {batchMedicine && (
        <BatchDialog
          medicine={batchMedicine}
          onClose={() => setBatchMedicine(null)}
        />
      )}
      {archive.isPending && <span className="sr-only">Archiving medicine</span>}
    </section>
  );
}
