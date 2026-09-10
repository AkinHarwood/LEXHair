import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  status: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  acceptInvite: (inviteToken: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "team-chat-auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          // Confirm the session is still valid before trusting cached state.
          const me = await api.get("/api/auth/me", saved.token);
          setToken(saved.token);
          setUser(me.user);
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken }));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post("/api/auth/login", { email, password });
      await persist(res.token, res.user);
    },
    [persist]
  );

  const acceptInvite = useCallback(
    async (inviteToken: string, password: string) => {
      const res = await api.post("/api/auth/accept-invite", { token: inviteToken, password });
      await persist(res.token, res.user);
    },
    [persist]
  );

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, acceptInvite, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
