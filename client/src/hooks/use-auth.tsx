import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";

export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  authProvider?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  googleLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUser(data: any): User {
  return {
    id: data.id,
    username: data.username,
    displayName: data.displayName ?? null,
    avatarUrl: data.avatarUrl ?? null,
    email: data.email ?? null,
    authProvider: data.authProvider ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUser(normalizeUser(data));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    setUser(normalizeUser(data));
    setLocation("/");
  };

  const register = async (username: string, password: string) => {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    setUser(normalizeUser(data));
    setLocation("/");
  };

  const googleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
    setLocation("/auth");
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, googleLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
