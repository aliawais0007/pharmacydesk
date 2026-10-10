import type { DashboardSummary } from "@pharmacy/contracts";
import { api } from "../../../shared/api/client";

export const dashboardService = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary"),
};