import type { User, UserCreateInput, UserUpdateInput } from "@pharmacy/contracts";
import { api } from "../../../shared/api/client";

export const userService = {
  list: () => api.get<User[]>("/users"),
  create: (input: UserCreateInput) => api.post<User>("/users", input),
  update: (id: number, input: UserUpdateInput) => api.patch<User>(`/users/${id}`, input),
  revokeSessions: (id: number) => api.delete(`/users/${id}/sessions`),
};