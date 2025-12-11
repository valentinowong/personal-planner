import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../data/remote/client";
import type { TaskWindowRow } from "../../../data/sync";

export type AssigneeProfile = { display_name: string | null; email: string | null };

function collectAssigneeSeeds(rows: TaskWindowRow[] | undefined) {
  const map: Record<string, AssigneeProfile> = {};
  (rows ?? []).forEach((row) => {
    if (!row.assignee_id) return;
    const existing = map[row.assignee_id] ?? { display_name: null, email: null };
    map[row.assignee_id] = {
      display_name: row.assignee_display_name ?? existing.display_name,
      email: row.assignee_email ?? existing.email,
    };
  });
  return map;
}

export function useAssigneeProfiles(
  start?: string,
  end?: string,
  extraAssigneeIds?: (string | null | undefined)[],
) {
  const queryClient = useQueryClient();

  const taskSources = useMemo(() => {
    if (start && end) {
      return [[["tasks", { start, end }], queryClient.getQueryData<TaskWindowRow[]>(["tasks", { start, end }])]] as const;
    }
    return queryClient.getQueriesData<TaskWindowRow[]>({ queryKey: ["tasks"] });
  }, [end, queryClient, start]);

  const seededProfiles = useMemo(() => {
    const seeds: Record<string, AssigneeProfile> = {};
    taskSources.forEach(([, rows]) => {
      Object.assign(seeds, collectAssigneeSeeds(rows));
    });
    return seeds;
  }, [taskSources]);

  const assigneeIds = useMemo(() => {
    const ids = new Set<string>();
    Object.keys(seededProfiles).forEach((id) => ids.add(id));
    (extraAssigneeIds ?? []).forEach((id) => {
      if (id) ids.add(id);
    });
    return Array.from(ids).sort();
  }, [extraAssigneeIds, seededProfiles]);

  const profilesQuery = useQuery({
    queryKey: ["assignee-profiles", assigneeIds.join("|")],
    enabled: assigneeIds.length > 0,
    placeholderData: seededProfiles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", assigneeIds);
      if (error) throw error;
      const map: Record<string, AssigneeProfile> = { ...seededProfiles };
      (data ?? []).forEach((row) => {
        map[row.user_id] = {
          display_name: row.display_name ?? map[row.user_id]?.display_name ?? null,
          email: map[row.user_id]?.email ?? null,
        };
      });
      return map;
    },
  });

  return {
    profilesById: profilesQuery.data ?? seededProfiles,
    isLoading: profilesQuery.isLoading,
  };
}
