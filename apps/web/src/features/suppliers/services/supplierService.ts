import type { Supplier, SupplierInput } from "@pharmacy/contracts";
import { api } from "../../../shared/api/client";

export const supplierService = {
    list: (search = "") =>
        api.get<Supplier[]>(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    create: (input: SupplierInput) => api.post<Supplier>("/suppliers", input),
    update: (id: number, input: Partial<SupplierInput>) => api.patch<Supplier>(`/suppliers/${id}`, input),
    archive: (id: number) => api.delete(`/suppliers/${id}`),
};