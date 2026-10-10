import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserCreateInput, UserUpdateInput } from "@pharmacy/contracts";
import { userService } from "../services/userService";

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: userService.list });
}

export function useUserActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const create = useMutation({ mutationFn: userService.create, onSuccess: refresh });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: UserUpdateInput }) => userService.update(id, input),
    onSuccess: refresh,
  });
  const revokeSessions = useMutation({ mutationFn: userService.revokeSessions, onSuccess: refresh });
  return { create, update, revokeSessions };
}