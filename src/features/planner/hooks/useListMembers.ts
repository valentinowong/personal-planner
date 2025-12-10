import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchListShares, inviteToListShare, revokeShare, type ListShareRow } from "../../../data/remote/sharesApi";
import { useLists } from "./useLists";
import { useAuth } from "../../auth/context/AuthContext";

export type ListMember = {
  user_id: string | null;
  email: string | null;
  role: "owner" | "collaborator";
  status: "pending" | "active" | "revoked";
  source?: ListShareRow;
};

export function useListMembers(listId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { data: lists } = useLists();
  const { session } = useAuth();
  const owner = useMemo(() => {
    if (!listId || !lists) return null;
    const list = lists.find((item) => item.id === listId);
    if (!list) return null;
    const ownerEmail = list.user_id === session?.user.id ? session?.user.email ?? null : "List owner";
    return {
      user_id: list.user_id,
      email: ownerEmail,
      role: "owner" as const,
      status: "active" as const,
      source: null,
    };
  }, [listId, lists, session?.user.email, session?.user.id]);

  const sharesQuery = useQuery({
    queryKey: ["list-shares", listId],
    queryFn: () => fetchListShares(listId ?? ""),
    enabled: Boolean(listId),
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: { email: string; role?: "owner" | "collaborator" }) =>
      inviteToListShare({ listId: listId ?? "", ...payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["list-shares", listId] }),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ shareId, memberUserId }: { shareId: string; memberUserId?: string | null }) =>
      revokeShare(shareId, { listId: listId ?? "", memberUserId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["list-shares", listId] }),
  });

  const members = useMemo(() => {
    const rows = sharesQuery.data ?? [];
    const activeShares = rows.filter((row) => row.status !== "revoked");
    const mapped = activeShares.map<ListMember>((row) => ({
      user_id: row.user_id,
      email: row.invited_email,
      role: row.role,
      status: row.status,
      source: row,
    }));
    const all = owner ? [owner, ...mapped] : mapped;
    // Deduplicate on user_id/email so owner doesn't double count.
    const seen = new Set<string>();
    return all.filter((member) => {
      const key = member.user_id ?? member.email ?? member.role;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [owner, sharesQuery.data]);

  const activeMembers = members.filter((member) => member.status === "active");

  return {
    members,
    activeMembers,
    isLoading: sharesQuery.isLoading,
    invite: inviteMutation.mutateAsync,
    revoke: revokeMutation.mutateAsync,
  };
}
