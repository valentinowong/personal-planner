import { Stack } from "expo-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { pushOutbox, subscribeToRealtime } from "../src/lib/sync";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { ThemeProvider, useTheme } from "../src/contexts/ThemeContext";
import { QueryProvider } from "../src/lib/queryClient";

function AppSyncBridge() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return undefined;
    const unsubscribe = subscribeToRealtime(queryClient);
    return () => unsubscribe();
  }, [queryClient, session]);

  useEffect(() => {
    if (!session) return undefined;
    const interval = setInterval(() => {
      pushOutbox().catch(() => undefined);
    }, 5000);
    return () => clearInterval(interval);
  }, [session]);

  return null;
}

function Navigator() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();
  const isLoggedIn = Boolean(session);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/sign-in" options={{ title: "Sign In" }} />
        <Stack.Screen name="(auth)/sign-up" options={{ title: "Create Account" }} />
      </Stack.Protected>

      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="task/[id]" options={{ title: "Task", presentation: "modal" }} />
        <Stack.Screen name="recurrence/new" options={{ title: "New Recurrence" }} />
        <Stack.Screen name="recurrence/[id]" options={{ title: "Edit Recurrence" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider>
            <PaperProvider>
              <AppSyncBridge />
              <Navigator />
            </PaperProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
