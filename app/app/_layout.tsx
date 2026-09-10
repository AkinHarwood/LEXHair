import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { SocketProvider } from "../lib/socket-context";

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "login" || segments[0] === "accept-invite";

    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#4F46E5" }, headerTintColor: "#fff" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="accept-invite" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: "Team Chat" }} />
      <Stack.Screen name="channel/[id]" options={{ title: "Channel" }} />
      <Stack.Screen name="dm/[id]" options={{ title: "Direct message" }} />
      <Stack.Screen name="new-dm" options={{ title: "New message" }} />
      <Stack.Screen name="search" options={{ title: "Search" }} />
      <Stack.Screen name="admin" options={{ title: "Admin" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <RootNavigator />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
