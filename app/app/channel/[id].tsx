import { useEffect, useState } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import ChatView from "../../components/ChatView";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api";
import type { Channel } from "../../lib/types";

export default function ChannelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const navigation = useNavigation();
  const [channel, setChannel] = useState<Channel | null>(null);

  useEffect(() => {
    api.get("/api/channels", token).then((res) => {
      const found = res.channels.find((c: Channel) => c.id === id);
      setChannel(found || null);
      navigation.setOptions({ title: found ? `#${found.name}` : "Channel" });
    });
  }, [id]);

  if (!channel) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#4F46E5" />
      </View>
    );
  }

  return <ChatView kind="channel" id={id} members={channel.members} />;
}
