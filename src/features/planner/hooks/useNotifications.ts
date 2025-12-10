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

  const unreadCount = (notificationsQuery.data ?? []).filter((item) => !item.read_at).length;

  return {
    ...notificationsQuery,
    unreadCount,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
  };
}
