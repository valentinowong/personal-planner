import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { usePlannerStyles } from "../../state/PlannerStylesContext";
import { useTheme } from "../../../../theme/ThemeContext";
import type { RemoteList } from "../../hooks/useLists";
import { useListMembers } from "../../hooks/useListMembers";

export type PlannerListSettingsModalProps = {
  visible: boolean;
  list: RemoteList | null;
  onClose: () => void;
  onSaveName: (listId: string, name: string) => Promise<void> | void;
  onDelete: (list: RemoteList) => void;
  onSendInvite: (email: string, role?: "owner" | "collaborator") => Promise<void> | void;
  onRemoveMember: (shareId: string, memberUserId?: string | null) => Promise<void> | void;
};

type TabKey = "details" | "sharing";

export function PlannerListSettingsModal({
  visible,
  list,
  onClose,
  onSaveName,
  onDelete,
  onSendInvite,
  onRemoveMember,
}: PlannerListSettingsModalProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [name, setName] = useState(list?.name ?? "");
  const [emailInput, setEmailInput] = useState("");

  const isInboxOrSystem = useMemo(() => {
    if (!list) return false;
    const lowered = (list.name ?? "").toLowerCase();
    return list.is_system || lowered === "inbox";
  }, [list]);

  const { members, activeMembers, isLoading, error: membersError, refetch: refetchMembers } = useListMembers(
    list?.id ?? null,
  );

  useEffect(() => {
    setName(list?.name ?? "");
  }, [list?.id, list?.name]);

  const handleInvite = async () => {
    if (!list || !emailInput.trim()) return;
    await onSendInvite(emailInput.trim(), "collaborator");
    setEmailInput("");
  };

  const handleRemove = async (shareId?: string, memberUserId?: string | null) => {
    if (!shareId) return;
    await onRemoveMember(shareId, memberUserId);
  };

  if (!visible) return null;

  const tabItems: { key: TabKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "sharing", label: "Sharing" },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.settingsModalCard} onPress={(event) => event.stopPropagation()}>
          <View style={styles.settingsModalShell}>
            <View style={styles.settingsSidebar}>
              <View style={styles.settingsHeader}>
                <View>
                  <Text style={styles.settingsUserName}>List Settings</Text>
                  <Text style={styles.settingsUserEmail}>{list?.name ?? "Select a list"}</Text>
                </View>
              </View>
              <View style={styles.settingsMenu}>
                {tabItems.map((item) => {
                  const active = activeTab === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      style={[styles.settingsMenuItem, active && styles.settingsMenuItemActive]}
                      onPress={() => setActiveTab(item.key)}
                    >
                      <Text style={[styles.settingsMenuItemText, active && styles.settingsMenuItemTextActive]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.settingsContent}>
              <ScrollView
                style={styles.settingsModalScroll}
                contentContainerStyle={styles.settingsModalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {activeTab === "details" ? (
                  <>
                    <Text style={styles.settingsPanelTitle}>Details</Text>
                    <View style={styles.settingsCard}>
                      <Text style={styles.settingsCardTitle}>Name</Text>
                      <TextInput
                        style={styles.settingsInput}
                        placeholder="List name"
                        placeholderTextColor={colors.placeholder}
                        value={name}
                        onChangeText={setName}
                      />
                    </View>

                    <View style={styles.settingsCard}>
                      <Text style={styles.settingsCardTitle}>Type</Text>
                      <Text style={styles.helperText}>
                        {isInboxOrSystem ? "System / Inbox list (not shareable)" : "Custom list (shareable)"}
                      </Text>
                    </View>

                    <View style={styles.settingsCard}>
                      <Text style={styles.settingsCardTitle}>Danger zone</Text>
                      <Pressable
                        style={[styles.modalDangerButton]}
                        onPress={() => list && onDelete(list)}
                        disabled={!list || isInboxOrSystem}
                      >
                        <Text style={styles.modalDangerText}>{isInboxOrSystem ? "Cannot delete Inbox" : "Delete list"}</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}

                {activeTab === "sharing" ? (
                  <>
                    <Text style={styles.settingsPanelTitle}>Sharing</Text>
                    {isInboxOrSystem ? (
                      <View style={styles.settingsCard}>
                        <Text style={styles.helperText}>Inbox and system lists cannot be shared.</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.settingsCard}>
                          <Text style={styles.settingsCardTitle}>Members</Text>
                          {membersError ? (
                            <View style={{ gap: 6 }}>
                              <Text style={[styles.helperText, { color: colors.error }]}>
                                Could not load members: {membersError.message ?? "Unknown error"}
                              </Text>
                              <Pressable style={styles.modalPrimaryButton} onPress={() => refetchMembers()}>
                                <Text style={styles.modalPrimaryText}>Retry</Text>
                              </Pressable>
                            </View>
                          ) : null}
                          {isLoading ? (
                            <Text style={styles.helperText}>Loading members…</Text>
                          ) : (members ?? []).length === 0 ? (
                            <Text style={styles.helperText}>No members yet.</Text>
                          ) : (
                            (members ?? []).map((member) => (
                              <View key={`${member.user_id ?? member.email}`} style={styles.shareRow}>
                                <View>
                                  <Text style={styles.shareMemberName}>{member.email ?? member.user_id ?? "Unknown member"}</Text>
                                  <Text style={styles.shareMemberMeta}>{member.role}</Text>
                                  <Text style={styles.shareMemberMeta}>Status: {member.status}</Text>
                                </View>
                                {member.source?.id ? (
                                  <Pressable
                                    onPress={() => handleRemove(member.source?.id, member.user_id)}
                                    style={styles.modalDangerButton}
                                  >
                                    <Text style={styles.modalDangerText}>Remove</Text>
                                  </Pressable>
                                ) : null}
                              </View>
                            ))
                          )}
                        </View>

                        <View style={styles.settingsCard}>
                          <Text style={styles.settingsCardTitle}>Invite collaborator</Text>
                          <View style={{ gap: 8 }}>
                            <TextInput
                              style={styles.settingsInput}
                              placeholder="Collaborator email"
                              placeholderTextColor={colors.placeholder}
                              value={emailInput}
                              onChangeText={setEmailInput}
                              autoCapitalize="none"
                              keyboardType="email-address"
                            />
                            <Pressable
                              style={[
                                styles.modalPrimaryButton,
                                (!emailInput.trim()) && styles.modalPrimaryDisabled,
                              ]}
                              disabled={!emailInput.trim()}
                              onPress={handleInvite}
                            >
                              <Text style={styles.modalPrimaryText}>Send invite</Text>
                            </Pressable>
                          </View>
                          <Text style={styles.modalSectionMeta}>
                            Invited collaborators become active once they accept. Only active members can be assigned tasks.
                          </Text>
                        </View>

                        <View style={styles.settingsCard}>
                          <Text style={styles.settingsCardTitle}>Assignment rules</Text>
                          <Text style={styles.modalSectionMeta}>
                            Single assignee per task. Scheduled tasks show only for the assignee. Unassigned tasks stay in backlog.
                          </Text>
                          <Text style={styles.modalSectionMeta}>
                            Removing a member auto-unassigns their tasks and records assignment history.
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                ) : null}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.taskDetailCancel} onPress={onClose}>
                  <Text style={styles.taskDetailCancelText}>Close</Text>
                </Pressable>
                {activeTab === "details" ? (
                  <Pressable
                    style={[styles.modalPrimaryButton, !name.trim() && styles.modalPrimaryDisabled]}
                    disabled={!name.trim()}
                    onPress={() => list && onSaveName(list.id, name.trim() || "Untitled list")}
                  >
                    <Text style={styles.modalPrimaryText}>Save changes</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.modalPrimaryButton, (!emailInput.trim() || isInboxOrSystem) && styles.modalPrimaryDisabled]}
                    disabled={!emailInput.trim() || isInboxOrSystem}
                    onPress={handleInvite}
                  >
                    <Text style={styles.modalPrimaryText}>{isInboxOrSystem ? "Unavailable" : "Send invite"}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
