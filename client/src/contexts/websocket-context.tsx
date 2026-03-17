import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/hooks/use-auth";

type MessageHandler = (msg: Record<string, unknown>) => void;

interface WebSocketContextType {
  send: (msg: object) => void;
  on: (type: string, handler: MessageHandler) => () => void;
  off: (type: string) => void;
  isConnected: boolean;
  onlineCount: number;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "authenticate", userId: user.id }));
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as Record<string, unknown>;
        if (msg.type === "online-count" || msg.type === "authenticated") {
          setOnlineCount((msg.count as number) ?? (msg.onlineCount as number) ?? 0);
        }
        const handler = handlersRef.current.get(msg.type as string);
        if (handler) handler(msg);
      } catch {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      if (user) {
        reconnectTimeoutRef.current = setTimeout(() => connect(), 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      connect();
    } else {
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
      setOnlineCount(0);
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user, connect]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const on = useCallback((type: string, handler: MessageHandler) => {
    handlersRef.current.set(type, handler);
    return () => {
      handlersRef.current.delete(type);
    };
  }, []);

  const off = useCallback((type: string) => {
    handlersRef.current.delete(type);
  }, []);

  return (
    <WebSocketContext.Provider value={{ send, on, off, isConnected, onlineCount }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be used within WebSocketProvider");
  return ctx;
}
