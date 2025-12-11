import { supabase } from "./client";
import { unassignTasksForMember } from "./tasksApi";

export type ListShareRow = {
  id: string;
  list_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: "owner" | "collaborator";
  status: "pending" | "active" | "revoked";
  invited_by: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ListShareWithMeta = ListShareRow & {
  list?: { id: string; name: string } | null;
  profile?: { user_id: string; display_name: string | null } | null;
};

export async function fetchListShares(listIdOrIds: string | string[]) {
  const listIds = Array.isArray(listIdOrIds) ? listIdOrIds : [listIdOrIds];
  if (!listIds.length) return [];
  const { data, error } = await supabase
    .from("list_shares")
    // Keep the select simple; joining profiles requires a declared FK relationship,
    // and in some environments (e.g., during debugging) that relationship may be missing.
    .select("*")
    .in("list_id", listIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ListShareWithMeta[];
}

export async function inviteToListShare(payload: { listId: string; email: string; role?: "owner" | "collaborator" }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const inviterId = sessionData.session?.user.id ?? null;
  const { error } = await supabase.from("list_shares").insert({
    list_id: payload.listId,
    invited_email: payload.email,
    role: payload.role ?? "collaborator",
    status: "pending",
    invited_by: inviterId,
  });
  if (error) throw error;
}

export async function acceptShare(shareId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Missing authenticated user");
  const { error } = await supabase
    .from("list_shares")
    .update({ status: "active", user_id: userId })
    .eq("id", shareId);
  if (error) throw error;
}

export async function declineShare(shareId: string) {
  const { error } = await supabase.from("list_shares").update({ status: "revoked" }).eq("id", shareId);
  if (error) throw error;
}

export async function revokeShare(shareId: string, options: { listId: string; memberUserId?: string | null }) {
  const { error } = await supabase.from("list_shares").update({ status: "revoked" }).eq("id", shareId);
  if (error) throw error;
  if (options.memberUserId) {
    try {
      await unassignTasksForMember(options.listId, options.memberUserId);
    } catch (err) {
      console.warn("Failed to unassign tasks after revoke", err);
    }
  }
}

export async function leaveList(listId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Missing authenticated user");
  const { data, error } = await supabase
    .from("list_shares")
    .select("id")
    .eq("list_id", listId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const shareId = data?.id;
  if (!shareId) return;
  await revokeShare(shareId, { listId, memberUserId: userId });
}

export async function fetchPendingInvitesForUser(params: { userId?: string | null; email?: string | null }) {
  const userId = params.userId ?? null;
  const email = params.email?.toLowerCase() ?? null;
  if (!userId && !email) return [];

  const { data, error } = await supabase
    .from("list_shares")
    .select("*, list:lists(id, name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as ListShareWithMeta[];
  return rows.filter((row) => {
    const emailMatch =
      email && row.invited_email ? row.invited_email.toLowerCase() === email.toLowerCase() : false;
    return row.status === "pending" && (row.user_id === userId || emailMatch);
  });
}
