import { useEffect, useState } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import ChatView from "../../components/ChatView";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api";
import type { Conversation } from "../../lib/types";

export default function DmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigation = useNavigation();
  const [conversation, setConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    api.get("/api/conversations", token).then((res) => {
      const found = res.conversations.find((c: Conversation) => c.id === id);
      setConversation(found || null);
      const others = found?.members.filter((m: any) => m.id !== user?.id).map((m: any) => m.name) || [];
      navigation.setOptions({ title: others.join(", ") || "Direct message" });
    });
  }, [id]);

  if (!conversation) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#4F46E5" />
      </View>
    );
  }

  return <ChatView kind="conversation" id={id} members={conversation.members} />;
}
