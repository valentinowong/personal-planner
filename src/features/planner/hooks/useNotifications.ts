import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "../../../data/remote/notificationsApi";
import { useAuth } from "../../auth/context/AuthContext";

export function useNotifications() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  const notificationsQuery = useQuery<NotificationRow[]>({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId ?? ""),
    enabled: Boolean(userId),
  });

  const filteredNotifications = (notificationsQuery.data ?? []).filter((item) => {
    // Drop sender confirmation
    if (item.kind === "share_invited_sent") return false;
    // Drop self-triggered assignment changes when actor_id matches the recipient
    if ((item.kind === "assignment_assigned" || item.kind === "assignment_unassigned") && userId) {
      const actorId = (item.payload?.actor_id as string | undefined) ?? null;
      if (actorId && actorId === userId) return false;
    }
    return true;
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Missing authenticated user");
      return markAllNotificationsRead(userId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const unreadCount = filteredNotifications.filter((item) => !item.read_at).length;

  return {
    ...notificationsQuery,
    data: filteredNotifications,
    unreadCount,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
  };
}
