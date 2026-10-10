import type { Sale, SaleInput } from "@pharmacy/contracts";
import { api } from "../../../shared/api/client";

export const salesService = {
    list: () => api.get<Sale[]>("/sales?limit=50"),
    create: (input: SaleInput) => api.post<Sale>("/sales", input),
};