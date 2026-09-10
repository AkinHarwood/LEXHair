import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";
import { useAuth } from "./auth-context";

type SocketState = {
  socket: Socket | null;
  connected: boolean;
  recentMentions: { id: string; body: string; channelId: string | null; conversationId: string | null }[];
  clearMentions: () => void;
};

const SocketContext = createContext<SocketState>({
  socket: null,
  connected: false,
  recentMentions: [],
  clearMentions: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [recentMentions, setRecentMentions] = useState<SocketState["recentMentions"]>([]);

  useEffect(() => {
    if (!token) {
      setSocketInstance((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      return;
    }

    const socket = io(API_URL, { auth: { token } });
    setSocketInstance(socket);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("mention:new", ({ message }) => {
      setRecentMentions((prev) => [
        { id: message.id, body: message.body, channelId: message.channelId, conversationId: message.conversationId },
        ...prev,
      ].slice(0, 20));
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketInstance,
        connected,
        recentMentions,
        clearMentions: () => setRecentMentions([]),
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
