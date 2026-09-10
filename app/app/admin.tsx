import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth-context";
import { api, ApiError } from "../lib/api";

type StaffUser = { id: string; name: string; email: string; role: "ADMIN" | "MEMBER"; status: string };
type Invite = { id: string; name: string; email: string; role: string; expiresAt: string };
type Channel = { id: string; name: string; description: string | null };

const TABS = ["Staff", "Invites", "Channels"] as const;

export default function Admin() {
  const { token } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Staff");
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");

  const load = async () => {
    const [u, i, c] = await Promise.all([
      api.get("/api/admin/users", token),
      api.get("/api/admin/invites", token),
      api.get("/api/channels", token),
    ]);
    setUsers(u.users);
    setInvites(i.invites);
    setChannels(c.channels);
  };

  useEffect(() => {
    load();
  }, []);

  const notify = (msg: string) => (Platform.OS === "web" ? alert(msg) : Alert.alert(msg));

  const sendInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return notify("Name and email are required");
    setBusy(true);
    try {
      const res = await api.post(
        "/api/admin/invites",
        { name: inviteName.trim(), email: inviteEmail.trim(), role: inviteAsAdmin ? "ADMIN" : "MEMBER" },
        token
      );
      setLastInviteLink(res.inviteLink);
      setInviteName("");
      setInviteEmail("");
      setInviteAsAdmin(false);
      await load();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not send invite");
    } finally {
      setBusy(false);
    }
  };

  const revokeInvite = async (id: string) => {
    await api.del(`/api/admin/invites/${id}`, token);
    await load();
  };

  const setUserStatus = async (id: string, status: "ACTIVE" | "DEACTIVATED") => {
    try {
      await api.patch(`/api/admin/users/${id}/status`, { status }, token);
      await load();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not update this person");
    }
  };

  const setUserRole = async (id: string, role: "ADMIN" | "MEMBER") => {
    await api.patch(`/api/admin/users/${id}/role`, { role }, token);
    await load();
  };

  const createChannel = async () => {
    if (!channelName.trim()) return notify("Channel name is required");
    setBusy(true);
    try {
      await api.post("/api/admin/channels", { name: channelName.trim(), description: channelDescription.trim() }, token);
      setChannelName("");
      setChannelDescription("");
      await load();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not create channel");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={tab === t ? styles.tabTextActive : styles.tabText}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {tab === "Staff" && (
          <>
            {users.map((u) => (
              <View key={u.id} style={styles.card}>
                <Text style={styles.cardTitle}>{u.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {u.email} · {u.role} · {u.status}
                </Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => setUserRole(u.id, u.role === "ADMIN" ? "MEMBER" : "ADMIN")}>
                    <Text style={styles.link}>{u.role === "ADMIN" ? "Make member" : "Make admin"}</Text>
                  </TouchableOpacity>
                  {u.status === "ACTIVE" ? (
                    <TouchableOpacity onPress={() => setUserStatus(u.id, "DEACTIVATED")}>
                      <Text style={[styles.link, { color: "#DC2626" }]}>Deactivate</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setUserStatus(u.id, "ACTIVE")}>
                      <Text style={styles.link}>Reactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {tab === "Invites" && (
          <>
            <Text style={styles.sectionTitle}>Invite a staff member</Text>
            <TextInput style={styles.input} placeholder="Full name" value={inviteName} onChangeText={setInviteName} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
            />
            <View style={styles.switchRow}>
              <Text>Make this person an admin</Text>
              <Switch value={inviteAsAdmin} onValueChange={setInviteAsAdmin} />
            </View>
            <TouchableOpacity style={styles.button} onPress={sendInvite} disabled={busy}>
              <Text style={styles.buttonText}>{busy ? "Sending…" : "Create invite"}</Text>
            </TouchableOpacity>

            {lastInviteLink && (
              <View style={styles.linkBox}>
                <Text style={{ fontWeight: "600", marginBottom: 4 }}>Share this link with them:</Text>
                <Text selectable style={{ color: "#4F46E5" }}>
                  {lastInviteLink}
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Pending invites</Text>
            {invites.length === 0 && <Text style={styles.hint}>No pending invites.</Text>}
            {invites.map((inv) => (
              <View key={inv.id} style={styles.card}>
                <Text style={styles.cardTitle}>{inv.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {inv.email} · {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                </Text>
                <TouchableOpacity onPress={() => revokeInvite(inv.id)}>
                  <Text style={[styles.link, { color: "#DC2626" }]}>Revoke</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {tab === "Channels" && (
          <>
            <Text style={styles.sectionTitle}>Create a channel</Text>
            <TextInput
              style={styles.input}
              placeholder="Channel name (e.g. operations)"
              value={channelName}
              onChangeText={setChannelName}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={channelDescription}
              onChangeText={setChannelDescription}
            />
            <TouchableOpacity style={styles.button} onPress={createChannel} disabled={busy}>
              <Text style={styles.buttonText}>{busy ? "Creating…" : "Create channel"}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Existing channels</Text>
            {channels.map((c) => (
              <View key={c.id} style={styles.card}>
                <Text style={styles.cardTitle}>#{c.name}</Text>
                {c.description ? <Text style={styles.cardSubtitle}>{c.description}</Text> : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#4F46E5" },
  tabText: { color: "#6B7280" },
  tabTextActive: { color: "#4F46E5", fontWeight: "700" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  button: { backgroundColor: "#4F46E5", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  linkBox: { backgroundColor: "#EEF2FF", borderRadius: 8, padding: 12, marginTop: 14 },
  card: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, marginBottom: 8 },
  cardTitle: { fontWeight: "600", color: "#111827" },
  cardSubtitle: { color: "#6B7280", fontSize: 12, marginTop: 2, marginBottom: 6 },
  actionsRow: { flexDirection: "row", gap: 16, marginTop: 4 },
  link: { color: "#4F46E5", fontWeight: "600" },
  hint: { color: "#9CA3AF" },
});
