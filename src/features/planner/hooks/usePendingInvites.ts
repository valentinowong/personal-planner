import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptShare,
  declineShare,
  fetchPendingInvitesForUser,
  type ListShareWithMeta,
} from "../../../data/remote/sharesApi";
import { useAuth } from "../../auth/context/AuthContext";

export function usePendingInvites() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? null;

  const invitesQuery = useQuery<ListShareWithMeta[]>({
    queryKey: ["pending-invites", userId, email],
    queryFn: () => fetchPendingInvitesForUser({ userId, email }),
    enabled: Boolean(userId || email),
  });

  // Temporary debug logging to help surface why invites might be missing for an invitee.
  // Safe to remove once issue is resolved.
  useEffect(() => {
    if (invitesQuery.isFetching) return;
    if (typeof console !== "undefined") {
      console.log("[usePendingInvites] params", { userId, email });
      console.log("[usePendingInvites] data", invitesQuery.data);
      console.log("[usePendingInvites] error", invitesQuery.error);
    }
  }, [userId, email, invitesQuery.data, invitesQuery.error, invitesQuery.isFetching]);

  const invalidateCaches = (listId?: string | null) => {
    queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    queryClient.invalidateQueries({ queryKey: ["lists"] });
    queryClient.invalidateQueries({ queryKey: ["list-shares"] });
    if (listId) {
      queryClient.invalidateQueries({ queryKey: ["list-shares", listId] });
    }
  };

  const acceptMutation = useMutation({
    mutationFn: (payload: { shareId: string; listId?: string | null }) => acceptShare(payload.shareId),
    onSuccess: (_data, variables) => invalidateCaches(variables.listId),
  });

  const declineMutation = useMutation({
    mutationFn: (payload: { shareId: string; listId?: string | null }) => declineShare(payload.shareId),
    onSuccess: (_data, variables) => invalidateCaches(variables.listId),
  });

  return {
    ...invitesQuery,
    acceptInvite: (invite: ListShareWithMeta) =>
      acceptMutation.mutateAsync({ shareId: invite.id, listId: invite.list_id }),
    declineInvite: (invite: ListShareWithMeta) =>
      declineMutation.mutateAsync({ shareId: invite.id, listId: invite.list_id }),
    accepting: acceptMutation.isPending,
    declining: declineMutation.isPending,
  };
}
