import { useState } from "react";
import { Archive, Edit2, Plus, Search, Truck } from "lucide-react";
import type { Supplier, SupplierInput } from "@pharmacy/contracts";
import { PageHeading } from "../../../shared/components/PageHeading";
import { useSupplierActions, useSuppliers } from "../hooks/useSuppliers";
import { SupplierForm } from "./SupplierForm";

export function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const {
    data: suppliers = [],
    isLoading,
    isError,
    error: queryError,
  } = useSuppliers(search);
  const { create, update, archive } = useSupplierActions();

  function save(input: SupplierInput) {
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

  function archiveSupplier(supplier: Supplier) {
    if (
      window.confirm(
        `Remove ${supplier.name} from the active supplier list? Existing batch records will be kept.`,
      )
    ) {
      archive.mutate(supplier.id, {
        onError: (cause) => setError(cause.message),
      });
    }
  }

  return (
    <section className="feature-page">
      <PageHeading
        eyebrow="PURCHASING"
        title="Suppliers"
        description="Keep distributor contact details alongside received stock."
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
            Add supplier
          </button>
        }
      />
      <div className="toolbar-row">
        <label className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search suppliers or phone"
            aria-label="Search suppliers"
          />
        </label>
        <span className="result-count">{suppliers.length} suppliers</span>
      </div>
      {error && !showForm && <p className="inline-error">{error}</p>}
      {isError && <p className="inline-error">{queryError.message}</p>}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th className="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="table-message">
                  Loading suppliers...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-message">
                  <Truck size={22} />
                  <span>No suppliers yet. Add your first distributor.</span>
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <span className="cell-strong">{supplier.name}</span>
                    {supplier.notes && (
                      <span className="cell-secondary">{supplier.notes}</span>
                    )}
                  </td>
                  <td>{supplier.contact_person || "—"}</td>
                  <td>{supplier.phone || "—"}</td>
                  <td>{supplier.email || "—"}</td>
                  <td className="address-cell">{supplier.address || "—"}</td>
                  <td className="actions-cell">
                    <button
                      className="icon-button"
                      title="Edit supplier"
                      aria-label={`Edit ${supplier.name}`}
                      onClick={() => {
                        setEditing(supplier);
                        setError("");
                        setShowForm(true);
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="icon-button danger-icon"
                      title="Archive supplier"
                      aria-label={`Archive ${supplier.name}`}
                      onClick={() => archiveSupplier(supplier)}
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
        <SupplierForm
          key={editing?.id ?? "new"}
          supplier={editing ?? undefined}
          busy={create.isPending || update.isPending}
          error={error}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={save}
        />
      )}
      {archive.isPending && <span className="sr-only">Archiving supplier</span>}
    </section>
  );
}
