import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SaleInput } from "@pharmacy/contracts";
import { salesService } from "../services/salesService";

export function useSales() {
    return useQuery({ queryKey: ["sales"], queryFn: salesService.list });
}

export function useCreateSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: SaleInput) => salesService.create(input),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["sales"] }),
                queryClient.invalidateQueries({ queryKey: ["medicines"] }),
            ]);
        },
    });
}