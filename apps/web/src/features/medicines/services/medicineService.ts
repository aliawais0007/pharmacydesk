import type { Medicine, MedicineBatch, MedicineBatchInput, MedicineInput } from "@pharmacy/contracts";
import { api } from "../../../shared/api/client";

export const medicineService = {
    list: (search = "") =>
        api.get<Medicine[]>(`/medicines${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    create: (input: MedicineInput) => api.post<Medicine>("/medicines", input),
    update: (id: number, input: Partial<MedicineInput>) => api.patch<Medicine>(`/medicines/${id}`, input),
    archive: (id: number) => api.delete(`/medicines/${id}`),
    batches: (medicineId: number) => api.get<MedicineBatch[]>(`/medicines/${medicineId}/batches`),
    receiveBatch: (medicineId: number, input: MedicineBatchInput) =>
        api.post<MedicineBatch>(`/medicines/${medicineId}/batches`, input),
};