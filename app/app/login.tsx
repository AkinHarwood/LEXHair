import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Team Chat</Text>
        <Text style={styles.subtitle}>Sign in with the email and password your admin set up for you.</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? "Signing in…" : "Sign in"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#4F46E5", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4, color: "#111827" },
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
