import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { api, fileUrl } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useSocket } from "../lib/socket-context";
import type { Member, Message } from "../lib/types";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|heic)$/i;

export default function ChatView({
  kind,
  id,
  members,
}: {
  kind: "channel" | "conversation";
  id: string;
  members: Member[];
}) {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{
    fileName: string;
    storedName: string;
    mimeType: string;
    size: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingMentionIds, setPendingMentionIds] = useState<string[]>([]);
  const listRef = useRef<FlatList<Message>>(null);

  const historyPath =
    kind === "channel" ? `/api/channels/${id}/messages` : `/api/conversations/${id}/messages`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(historyPath, token)
      .then((res) => {
        if (!cancelled) setMessages(res.messages);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit(kind === "channel" ? "channel:join" : "conversation:join", id);

    const onNew = (msg: Message) => {
      const belongs = kind === "channel" ? msg.channelId === id : msg.conversationId === id;
      if (belongs) setMessages((prev) => [...prev, msg]);
    };
    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [socket, id, kind]);

  const otherMembers = members.filter((m) => m.id !== user?.id);

  const handleChangeText = (value: string) => {
    setText(value);
    const match = value.match(/@([\w ]*)$/);
    setMentionQuery(match ? match[1].toLowerCase() : null);
  };

  const selectMention = (member: Member) => {
    setText((prev) => prev.replace(/@([\w ]*)$/, `@${member.name} `));
    setPendingMentionIds((prev) => [...new Set([...prev, member.id])]);
    setMentionQuery(null);
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!token) return;
    setUploading(true);
    try {
      const { uploadFile } = await import("../lib/upload");
      const uploaded = await uploadFile(
        { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size, file: (asset as any).file },
        token
      );
      setPendingAttachment(uploaded);
    } catch (e: any) {
      alert(e.message || "Could not upload file");
    } finally {
      setUploading(false);
    }
  };

  const send = () => {
    if (!socket || (!text.trim() && !pendingAttachment)) return;
    const payload: any = {
      body: text.trim() || (pendingAttachment ? `(sent a file: ${pendingAttachment.fileName})` : ""),
      mentionedUserIds: pendingMentionIds,
      attachments: pendingAttachment ? [pendingAttachment] : [],
    };
    if (kind === "channel") payload.channelId = id;
    else payload.conversationId = id;

    socket.emit("message:send", payload, (ack: any) => {
      if (!ack?.ok) alert(ack?.error || "Message failed to send");
    });
    setText("");
    setPendingAttachment(null);
    setPendingMentionIds([]);
    setMentionQuery(null);
  };

  const renderItem = useCallback(
    ({ item }: { item: Message }) => <MessageRow message={item} isOwn={item.authorId === user?.id} token={token} />,
    [user?.id, token]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4F46E5" />
      </View>
    );
  }

  const mentionCandidates = mentionQuery !== null
    ? otherMembers.filter((m) => m.name.toLowerCase().includes(mentionQuery))
    : [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {mentionCandidates.length > 0 && (
        <View style={styles.mentionList}>
          {mentionCandidates.slice(0, 5).map((m) => (
            <TouchableOpacity key={m.id} style={styles.mentionItem} onPress={() => selectMention(m)}>
              <Text>@{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {pendingAttachment && (
        <View style={styles.attachmentPreview}>
          <Text numberOfLines={1} style={{ flex: 1 }}>
            📎 {pendingAttachment.fileName}
          </Text>
          <TouchableOpacity onPress={() => setPendingAttachment(null)}>
            <Text style={{ color: "#DC2626" }}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity onPress={pickFile} style={styles.iconButton} disabled={uploading}>
          <Text style={{ fontSize: 18 }}>{uploading ? "…" : "📎"}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChangeText}
          placeholder="Message… (use @ to mention someone)"
          multiline
          onSubmitEditing={send}
        />
        <TouchableOpacity onPress={send} style={styles.sendButton}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageRow({ message, isOwn, token }: { message: Message; isOwn: boolean; token: string | null }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
      <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
        {!isOwn && <Text style={styles.authorName}>{message.author.name}</Text>}
        <Text style={isOwn ? styles.bodyOwn : styles.body}>{message.body}</Text>
        {message.attachments.map((a) => {
          const isImage = IMAGE_EXTENSIONS.test(a.fileName);
          const url = fileUrl(a.filePath, token);
          return isImage ? (
            <Image key={a.id} source={{ uri: url }} style={styles.attachmentImage} resizeMode="cover" />
          ) : (
            <Pressable key={a.id} onPress={() => Platform.OS === "web" && window.open(url, "_blank")}>
              <Text style={[styles.fileLink, isOwn && { color: "#E0E7FF" }]}>📄 {a.fileName}</Text>
            </Pressable>
          );
        })}
        <Text style={[styles.time, isOwn && { color: "#C7D2FE" }]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  messageRow: { marginBottom: 10, alignItems: "flex-start" },
  messageRowOwn: { alignItems: "flex-end" },
  bubble: { backgroundColor: "#F1F1F4", borderRadius: 12, padding: 10, maxWidth: "80%" },
  bubbleOwn: { backgroundColor: "#4F46E5" },
  authorName: { fontWeight: "600", fontSize: 12, marginBottom: 2, color: "#4F46E5" },
  body: { color: "#111827", fontSize: 15 },
  bodyOwn: { color: "#fff", fontSize: 15 },
  time: { fontSize: 10, color: "#9CA3AF", marginTop: 4, alignSelf: "flex-end" },
  attachmentImage: { width: 180, height: 140, borderRadius: 8, marginTop: 6 },
  fileLink: { color: "#4F46E5", textDecorationLine: "underline", marginTop: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  iconButton: { padding: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    marginHorizontal: 6,
  },
  sendButton: { backgroundColor: "#4F46E5", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  mentionList: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    maxHeight: 160,
  },
  mentionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
});
