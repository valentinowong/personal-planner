import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchListShares, inviteToListShare, revokeShare, type ListShareRow } from "../../../data/remote/sharesApi";
import { useLists } from "./useLists";
import { useAuth } from "../../auth/context/AuthContext";
import { supabase } from "../../../data/remote/client";

export type ListMember = {
  user_id: string | null;
  email: string | null;
  display_name?: string | null;
  role: "owner" | "collaborator";
  status: "pending" | "active" | "revoked";
  list_id?: string | null;
  list_ids?: string[];
  sources?: ListShareRow[];
  source?: ListShareRow;
};

export function useListMembers(listIds: string | (string | null | undefined)[] | null | undefined) {
  const queryClient = useQueryClient();
  const { data: lists } = useLists();
  const { session } = useAuth();
  const normalizedListIds = useMemo(() => {
    if (!listIds) return [];
    if (Array.isArray(listIds)) {
      return Array.from(new Set(listIds.filter(Boolean) as string[]));
    }
    return listIds ? [listIds] : [];
  }, [listIds]);

  const owners = useMemo(() => {
    if (!lists || !normalizedListIds.length) return [];
    return normalizedListIds
      .map((listId) => {
        const list = lists.find((item) => item.id === listId);
        if (!list) return null;
        const isSelf = list.user_id === session?.user.id;
        const ownerEmail = isSelf ? session?.user.email ?? null : "List owner";
        const ownerDisplayName = isSelf ? (session?.user.user_metadata?.display_name as string | undefined) ?? null : null;
        return {
          user_id: list.user_id,
          email: ownerEmail,
          display_name: ownerDisplayName,
          role: "owner" as const,
          status: "active" as const,
          list_id: list.id,
          source: null,
        };
      })
      .filter(Boolean) as ListMember[];
  }, [lists, normalizedListIds, session?.user.email, session?.user.id, session?.user.user_metadata]);

  const sharesQuery = useQuery({
    queryKey: ["list-shares", normalizedListIds.join("|")],
    queryFn: () => fetchListShares(normalizedListIds),
    enabled: normalizedListIds.length > 0,
  });

  const ownerProfileQuery = useQuery({
    queryKey: ["profile", "owners", normalizedListIds.join("|")],
    queryFn: async () => {
      const ownerIds = owners
        .filter((owner) => owner.user_id && (!owner.display_name || owner.display_name === "List owner"))
        .map((owner) => owner.user_id) as string[];
      if (!ownerIds.length) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ownerIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: owners.some((owner) => owner.user_id && (!owner.display_name || owner.display_name === "List owner")),
    staleTime: 5 * 60 * 1000,
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
      display_name: (row as any)?.profile?.display_name ?? null,
      role: row.role,
      status: row.status,
      list_id: row.list_id,
      sources: [row],
      source: row,
    }));

    const ownerProfiles = ownerProfileQuery.data as { user_id: string; display_name: string | null }[] | undefined;
    const ownersWithProfiles = owners.map((owner) => ({
      ...owner,
      display_name:
        owner.display_name ??
        ownerProfiles?.find((profile) => profile.user_id === owner.user_id)?.display_name ??
        owner.email,
    }));

    const aggregate: Record<string, ListMember> = {};
    const mergeMember = (member: ListMember) => {
      const key = member.user_id ?? member.email ?? member.role;
      const existing = aggregate[key];
      const nextListIds = [
        ...(existing?.list_ids ?? []),
        ...(member.list_id ? [member.list_id] : []),
        ...(member.list_ids ?? []),
      ].filter(Boolean) as string[];
      const incomingSources = member.sources ?? (member.source ? [member.source] : []);
      aggregate[key] = {
        ...existing,
        ...member,
        list_ids: Array.from(new Set(nextListIds)),
        sources: [...(existing?.sources ?? []), ...incomingSources].filter(Boolean) as ListShareRow[],
        source: member.source ?? existing?.source,
      };
    };

    ownersWithProfiles.forEach(mergeMember);
    mapped.forEach(mergeMember);

    return Object.values(aggregate);
  }, [owners, ownerProfileQuery.data, sharesQuery.data]);

  const activeMembers = members.filter((member) => member.status === "active" || member.status === "accepted");
  const memberByUserId = useMemo(() => {
    const map: Record<string, ListMember> = {};
    members.forEach((member) => {
      if (member.user_id) {
        map[member.user_id] = member;
      }
    });
    return map;
  }, [members]);

  return {
    members,
    activeMembers,
    memberByUserId,
    isLoading: sharesQuery.isLoading,
    error: sharesQuery.error,
    refetch: sharesQuery.refetch,
    invite: inviteMutation.mutateAsync,
    revoke: revokeMutation.mutateAsync,
  };
}
