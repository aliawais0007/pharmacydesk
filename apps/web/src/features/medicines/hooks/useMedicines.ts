import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MedicineBatchInput, MedicineInput } from "@pharmacy/contracts";
import { medicineService } from "../services/medicineService";

export function useMedicines(search = "") {
    return useQuery({ queryKey: ["medicines", search], queryFn: () => medicineService.list(search) });
}

export function useMedicineBatches(medicineId: number | null) {
    return useQuery({
        queryKey: ["medicines", medicineId, "batches"],
        queryFn: () => medicineService.batches(medicineId!),
        enabled: medicineId !== null,
    });
}

export function useMedicineActions() {
    const queryClient = useQueryClient();
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["medicines"] });

    const create = useMutation({ mutationFn: medicineService.create, onSuccess: refresh });
    const update = useMutation({
        mutationFn: ({ id, input }: { id: number; input: Partial<MedicineInput> }) =>
            medicineService.update(id, input),
        onSuccess: refresh,
    });
    const archive = useMutation({ mutationFn: medicineService.archive, onSuccess: refresh });
    const receiveBatch = useMutation({
        mutationFn: ({ medicineId, input }: { medicineId: number; input: MedicineBatchInput }) =>
            medicineService.receiveBatch(medicineId, input),
        onSuccess: refresh,
    });

    return { create, update, archive, receiveBatch };
}