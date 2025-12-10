import { Modal, Pressable, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NotificationRow } from "../../../../data/remote/notificationsApi";
import type { ListShareWithMeta } from "../../../../data/remote/sharesApi";
import { usePlannerStyles } from "../../state/PlannerStylesContext";
import { useTheme } from "../../../../theme/ThemeContext";
import { useEffect, useMemo, useState } from "react";

export type PlannerNotificationsModalProps = {
  visible: boolean;
  notifications: NotificationRow[];
  loading?: boolean;
  invites: ListShareWithMeta[];
  invitesLoading?: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
  onAcceptInvite: (shareId: string) => Promise<void> | void;
  onDeclineInvite: (shareId: string) => Promise<void> | void;
};

export function PlannerNotificationsModal({
  visible,
  notifications,
  loading,
  invites,
  invitesLoading,
  onClose,
  onMarkRead,
  onMarkAll,
  onAcceptInvite,
  onDeclineInvite,
}: PlannerNotificationsModalProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<"notifications" | "invites">("notifications");
  const [actioning, setActioning] = useState<{ id: string; kind: "accept" | "decline" } | null>(null);

  const inviteCount = invites.length;

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [notifications],
  );

  useEffect(() => {
    if (!visible) {
      setActioning(null);
      return;
    }
    if (inviteCount > 0 && sortedNotifications.length === 0) {
      setActiveTab("invites");
    }
  }, [visible, inviteCount, sortedNotifications.length]);

  const renderKindMeta = (item: NotificationRow) => {
    const friendly =
      item.kind === "share_invited"
        ? "Share invite"
        : item.kind === "share_invited_sent"
          ? "Invite sent"
          : item.kind === "share_accepted"
            ? "Invite accepted"
            : item.kind === "share_revoked"
              ? "Share revoked"
              : item.kind === "assignment_assigned"
                ? "Assigned to you"
                : item.kind === "assignment_unassigned"
                  ? "Unassigned"
                  : "Update";
    const iconName =
      item.kind === "share_invited" || item.kind === "share_invited_sent"
        ? "person-add"
        : item.kind === "share_accepted"
          ? "checkmark-done"
          : item.kind === "share_revoked"
            ? "remove-circle"
            : item.kind === "assignment_assigned"
              ? "briefcase"
              : item.kind === "assignment_unassigned"
                ? "swap-horizontal"
                : "notifications";
    return { friendly, iconName };
  };

  const renderBody = (item: NotificationRow) => {
    const payload = item.payload ?? {};
    const title = (payload.title as string | undefined) ?? (payload.list_name as string | undefined) ?? "";
    const listName = payload.list_name as string | undefined;
    if (!title && !listName) return null;
    return (
      <Text style={styles.notificationBody}>
        {title || listName}
      </Text>
    );
  };

  const handleInviteAction = async (shareId: string, kind: "accept" | "decline") => {
    setActioning({ id: shareId, kind });
    try {
      if (kind === "accept") {
        await onAcceptInvite(shareId);
      } else {
        await onDeclineInvite(shareId);
      }
    } finally {
      setActioning((current) => (current?.id === shareId ? null : current));
    }
  };

  const inviteContent = () => {
    if (invitesLoading) {
      return <Text style={styles.helperText}>Loading invites…</Text>;
    }
    if (invites.length === 0) {
      return <Text style={[styles.helperText, { textAlign: "center" }]}>No invites—ask to be added to a list.</Text>;
    }
    return invites.map((invite) => {
      const created = invite.created_at ? new Date(invite.created_at).toLocaleString() : "";
      const mutating = actioning?.id === invite.id;
      const isAccepting = mutating && actioning?.kind === "accept";
      const isDeclining = mutating && actioning?.kind === "decline";
      const inviterLabel = invite.invited_by ?? "Unknown inviter";
      return (
        <View key={invite.id} style={[styles.notificationRow, styles.inviteCard]}>
          <View style={styles.notificationMeta}>
            <Text style={styles.notificationTitle}>{invite.list?.name ?? "Shared list"}</Text>
            <Text style={styles.notificationTime}>{created}</Text>
          </View>
          <Text style={styles.notificationBodySecondary}>Invited by {inviterLabel}</Text>
          <View style={styles.inviteActionsRow}>
            <Pressable
              style={[
                styles.inviteButton,
                mutating && styles.inviteButtonDisabled,
              ]}
              disabled={mutating}
              onPress={() => handleInviteAction(invite.id, "accept")}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <Text style={styles.inviteButtonText}>Accept</Text>
              )}
            </Pressable>
            <Pressable
              style={[
                styles.inviteButtonSecondary,
                mutating && styles.inviteButtonSecondaryDisabled,
              ]}
              disabled={mutating}
              onPress={() => handleInviteAction(invite.id, "decline")}
            >
              {isDeclining ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.inviteButtonSecondaryText}>Decline</Text>
              )}
            </Pressable>
          </View>
        </View>
      );
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={styles.settingsPanelTitle}>Notifications</Text>
              <Text style={styles.modalSubtitle}>In-app updates about shares and assignments</Text>
            </View>
            <Pressable style={styles.todayButton} onPress={onMarkAll} disabled={loading}>
              <Text style={styles.todayButtonText}>{loading ? "Marking…" : "Mark all read"}</Text>
            </Pressable>
          </View>
          <View style={styles.modalTabRow}>
            <Pressable
              style={[styles.modalTab, activeTab === "notifications" && styles.modalTabActive]}
              onPress={() => setActiveTab("notifications")}
            >
              <Text style={[styles.modalTabText, activeTab === "notifications" && styles.modalTabTextActive]}>
                Updates
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modalTab, activeTab === "invites" && styles.modalTabActive, { flexShrink: 0 }]}
              onPress={() => setActiveTab("invites")}
            >
              <Text style={[styles.modalTabText, activeTab === "invites" && styles.modalTabTextActive]}>Invites</Text>
              {inviteCount > 0 ? (
                <View style={styles.modalTabBadge}>
                  <Text style={styles.modalTabBadgeText}>{inviteCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: 520, width: "100%" }}
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "invites"
              ? inviteContent()
              : loading
                ? <Text style={styles.helperText}>Loading…</Text>
                : sortedNotifications.length === 0
                  ? <Text style={[styles.helperText, { textAlign: "center" }]}>You’re all caught up.</Text>
                  : sortedNotifications.map((item) => {
                      const isUnread = !item.read_at;
                      const { friendly, iconName } = renderKindMeta(item);
                      const body = renderBody(item);
                      return (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.notificationRow,
                            isUnread && { backgroundColor: colors.surface },
                          ]}
                          onPress={() => onMarkRead(item.id)}
                          >
                            <View style={styles.notificationRowTop}>
                              <View style={styles.notificationIconWrap}>
                                <Ionicons name={iconName as any} size={16} color={colors.primary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={styles.notificationMeta}>
                                  <Text style={styles.notificationTitle}>{friendly}</Text>
                                  <Text style={styles.notificationTime}>{new Date(item.created_at).toLocaleString()}</Text>
                                </View>
                                {body}
                                {item.payload?.list_name ? (
                                  <Text style={styles.notificationBodySecondary}>{item.payload.list_name as string}</Text>
                                ) : null}
                              </View>
                              <View style={styles.notificationKindPill}>
                                <Text style={styles.notificationKindText}>{item.kind}</Text>
                              </View>
                              {isUnread ? <View style={styles.notificationUnreadDot} /> : null}
                            </View>
                          </Pressable>
                        );
                    })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
