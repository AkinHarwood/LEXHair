import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";

type Result = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string };
  channel: { id: string; name: string } | null;
  conversation: { id: string; isGroup: boolean } | null;
};

export default function Search() {
  const { token } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      api
        .get(`/api/search?q=${encodeURIComponent(query.trim())}`, token)
        .then((res) => setResults(res.results))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <TextInput
        style={styles.input}
        placeholder="Search messages…"
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      {loading && <ActivityIndicator color="#4F46E5" style={{ marginTop: 8 }} />}
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              item.channel
                ? router.push(`/channel/${item.channel.id}`)
                : item.conversation && router.push(`/dm/${item.conversation.id}`)
            }
          >
            <Text style={styles.location}>{item.channel ? `#${item.channel.name}` : "Direct message"}</Text>
            <Text style={styles.body} numberOfLines={2}>
              <Text style={{ fontWeight: "600" }}>{item.author.name}: </Text>
              {item.body}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.trim().length >= 2 && !loading ? <Text style={styles.hint}>No matches.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    margin: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  location: { fontSize: 12, color: "#4F46E5", fontWeight: "700", marginBottom: 2 },
  body: { color: "#374151" },
  hint: { textAlign: "center", color: "#9CA3AF", marginTop: 24 },
});
