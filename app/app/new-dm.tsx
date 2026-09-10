import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import type { Member } from "../lib/types";

export default function NewDm() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.get("/api/users", token).then((res) => setUsers(res.users.filter((u: any) => u.id !== user?.id)));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const start = async () => {
    if (!selected.length) return;
    setStarting(true);
    try {
      const res = await api.post("/api/conversations", { memberIds: selected }, token);
      router.replace(`/dm/${res.conversation.id}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Text style={styles.hint}>Select one person for a direct message, or a few for a group message.</Text>
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggle(item.id)}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={{ color: isSelected ? "#4F46E5" : "#D1D5DB", fontSize: 18 }}>
                {isSelected ? "✓" : "○"}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.hint}>No other active staff yet.</Text>}
      />
      <TouchableOpacity
        style={[styles.button, !selected.length && { opacity: 0.5 }]}
        onPress={start}
        disabled={!selected.length || starting}
      >
        <Text style={styles.buttonText}>
          {starting ? "Starting…" : `Start message${selected.length > 1 ? " (group)" : ""}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: "#6B7280", padding: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  name: { fontSize: 16, color: "#111827" },
  button: { backgroundColor: "#4F46E5", padding: 16, alignItems: "center", margin: 16, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
