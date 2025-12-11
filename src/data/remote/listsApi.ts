import { supabase } from "./client";

export type ListRow = {
  id: string;
  user_id: string;
  name: string;
  sort_index: number;
  is_system: boolean;
};

type ListShareWithList = {
  id: string;
  list: ListRow | null;
  user_id: string | null;
  invited_email: string | null;
  status: string | null;
};

export async function fetchLists(params: { userId?: string | null; email?: string | null } = {}) {
  const userId = params.userId ?? null;
  const email = params.email?.toLowerCase() ?? null;

  // If we don't know who the user is, avoid returning anything to prevent leaking other users' lists.
  if (!userId && !email) return [];

  const ownedPromise = supabase
    .from("lists")
    .select("*")
    .eq("user_id", userId ?? "")
    .order("sort_index", { ascending: true });

  const sharedPromise = supabase
    .from("list_shares")
    .select("id, status, user_id, invited_email, list:lists(*)")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .or(
      [
        userId ? `user_id.eq.${userId}` : null,
        email ? `invited_email.eq.${email}` : null,
      ]
        .filter(Boolean)
        .join(","),
    );

  const [{ data: ownedData, error: ownedError }, { data: sharedData, error: sharedError }] = await Promise.all([
    ownedPromise,
    sharedPromise,
  ]);

  if (ownedError) throw ownedError;
  if (sharedError) throw sharedError;

  const ownedLists = (ownedData ?? []) as ListRow[];
  const sharedLists = (sharedData ?? [])
    .map((row) => (row as ListShareWithList).list)
    .filter((item): item is ListRow => Boolean(item));

  // Combine and deduplicate by id to avoid showing the same list twice.
  const combined = [...ownedLists, ...sharedLists];
  const seen = new Set<string>();
  const unique = combined.filter((list) => {
    if (!list?.id) return false;
    if (seen.has(list.id)) return false;
    seen.add(list.id);
    return true;
  });

  // Preserve the sort order users set on their own lists; shared lists fall back to name ordering.
  return unique.sort((a, b) => {
    const aSort = a.sort_index ?? Number.MAX_SAFE_INTEGER;
    const bSort = b.sort_index ?? Number.MAX_SAFE_INTEGER;
    if (aSort !== bSort) return aSort - bSort;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

export async function insertLists(payload: Partial<ListRow>[]) {
  if (!payload.length) return;
  const { error } = await supabase.from("lists").insert(payload);
  if (error) throw error;
}

export async function upsertList(payload: Partial<ListRow> & { name: string }) {
  const { error } = await supabase.from("lists").upsert(payload);
  if (error) throw error;
}

export async function deleteList(listId: string) {
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw error;
}
