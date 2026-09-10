import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth-context";
import { api, ApiError } from "../lib/api";

export default function AcceptInvite() {
  const params = useLocalSearchParams<{ token?: string }>();
  const inviteToken = params.token || "";
  const { acceptInvite } = useAuth();

  const [invite, setInvite] = useState<{ email: string; name: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setLoadError("This invite link is missing its token.");
      return;
    }
    api
      .get(`/api/auth/invites/${inviteToken}`)
      .then(setInvite)
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "This invite could not be loaded."));
  }, [inviteToken]);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setSubmitting(true);
    try {
      await acceptInvite(inviteToken, password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Team Chat</Text>

        {loadError && <Text style={styles.error}>{loadError}</Text>}

        {!invite && !loadError && <ActivityIndicator color="#4F46E5" style={{ marginTop: 12 }} />}

        {invite && (
          <>
            <Text style={styles.subtitle}>
              Hi {invite.name} — set a password for {invite.email} to finish joining your team.
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <TextInput
              style={styles.input}
              placeholder="New password (8+ characters)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              onSubmitEditing={onSubmit}
            />
            <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? "Setting up…" : "Join team chat"}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#4F46E5", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8, color: "#111827" },
  subtitle: { color: "#6B7280", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  button: { backgroundColor: "#4F46E5", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#DC2626", marginBottom: 12 },
});
