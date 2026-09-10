import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth-context";
import { useSocket } from "../lib/socket-context";
import { api } from "../lib/api";
import type { Channel, Conversation } from "../lib/types";

export default function Home() {
  const { user, token, logout } = useAuth();
  const { socket, recentMentions } = useSocket();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [c, d] = await Promise.all([api.get("/api/channels", token), api.get("/api/conversations", token)]);
    setChannels(c.channels);
    setConversations(d.conversations);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!socket) return;
    const onNew = () => load();
    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [socket, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const dmLabel = (conv: Conversation) => {
    const others = conv.members.filter((m) => m.id !== user?.id).map((m) => m.name);
    return others.join(", ") || "Just you";
  };

  const sections = [
    { type: "header" as const, label: "Channels" },
    ...channels.map((c) => ({ type: "channel" as const, item: c })),
    { type: "header" as const, label: "Direct messages" },
    ...conversations.map((c) => ({ type: "conversation" as const, item: c })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.topBar}>
        <Text style={styles.greeting}>Hi, {user?.name?.split(" ")[0]}</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={() => router.push("/search")} style={styles.iconBtn}>
            <Text>🔍</Text>
          </TouchableOpacity>
          {user?.role === "ADMIN" && (
            <TouchableOpacity onPress={() => router.push("/admin")} style={styles.iconBtn}>
              <Text>⚙️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => logout()} style={styles.iconBtn}>
            <Text style={{ color: "#DC2626" }}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {recentMentions.length > 0 && (
        <View style={styles.mentionBanner}>
          <Text style={{ color: "#92400E" }}>
            You were mentioned {recentMentions.length} time{recentMentions.length > 1 ? "s" : ""} recently
          </Text>
        </View>
      )}

      <FlatList
        data={sections}
        keyExtractor={(s, i) => (s.type === "header" ? `h-${s.label}` : s.item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item: s }) => {
          if (s.type === "header") {
            return <Text style={styles.sectionHeader}>{s.label}</Text>;
          }
          if (s.type === "channel") {
            return (
              <TouchableOpacity style={styles.row} onPress={() => router.push(`/channel/${s.item.id}`)}>
                <Text style={styles.rowTitle}>#{s.item.name}</Text>
                {s.item.description ? <Text style={styles.rowSubtitle}>{s.item.description}</Text> : null}
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/dm/${s.item.id}`)}>
              <Text style={styles.rowTitle}>{dmLabel(s.item)}</Text>
              {s.item.lastMessage ? (
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {s.item.lastMessage.body}
                </Text>
              ) : (
                <Text style={styles.rowSubtitle}>No messages yet</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No channels yet. Ask your admin to add you to one.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push("/new-dm")}>
        <Text style={{ color: "#fff", fontSize: 22, lineHeight: 24 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  greeting: { fontSize: 18, fontWeight: "700", color: "#111827" },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { padding: 6 },
  mentionBanner: { backgroundColor: "#FEF3C7", padding: 10, paddingHorizontal: 16 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  rowSubtitle: { color: "#6B7280", marginTop: 2 },
  empty: { textAlign: "center", color: "#9CA3AF", marginTop: 40 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});
