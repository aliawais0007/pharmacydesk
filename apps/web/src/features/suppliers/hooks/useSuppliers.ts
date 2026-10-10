import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupplierInput } from "@pharmacy/contracts";
import { supplierService } from "../services/supplierService";

export function useSuppliers(search = "") {
    return useQuery({ queryKey: ["suppliers", search], queryFn: () => supplierService.list(search) });
}

export function useSupplierActions() {
    const queryClient = useQueryClient();
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    const create = useMutation({ mutationFn: supplierService.create, onSuccess: refresh });
    const update = useMutation({
        mutationFn: ({ id, input }: { id: number; input: Partial<SupplierInput> }) =>
            supplierService.update(id, input),
        onSuccess: refresh,
    });
    const archive = useMutation({ mutationFn: supplierService.archive, onSuccess: refresh });
    return { create, update, archive };
}