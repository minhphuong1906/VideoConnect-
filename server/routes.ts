import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import crypto from "crypto";

const MemoryStoreSession = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const connectedClients = new Map<string, WebSocket>();
const matchQueue: string[] = [];
const rooms = new Map<string, [string, string]>();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "videocall_salt").digest("hex");
}

function broadcastOnlineCount() {
  const count = connectedClients.size;
  const message = JSON.stringify({ type: "online-count", count });
  Array.from(connectedClients.values()).forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function getPartnerUserId(roomId: string, userId: string): string | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  return room[0] === userId ? room[1] : room[0];
}

function removeFromQueue(userId: string) {
  const idx = matchQueue.indexOf(userId);
  if (idx !== -1) matchQueue.splice(idx, 1);
}

function handleDisconnect(userId: string) {
  connectedClients.delete(userId);
  removeFromQueue(userId);
  Array.from(rooms.entries()).forEach(([roomId, [u1, u2]]) => {
    if (u1 === userId || u2 === userId) {
      const partnerId = u1 === userId ? u2 : u1;
      const partnerWs = connectedClients.get(partnerId);
      if (partnerWs?.readyState === WebSocket.OPEN) {
        partnerWs.send(JSON.stringify({ type: "peer-disconnected" }));
      }
      rooms.delete(roomId);
    }
  });
  broadcastOnlineCount();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "videocall-super-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({ checkPeriod: 86400000 }),
      cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true },
    })
  );

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }

  app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: "Username must be 3–20 characters" });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ message: "Username is already taken" });
    }
    const user = await storage.createUser({ username, password: hashPassword(password) });
    req.session.userId = user.id;
    res.status(201).json({ id: user.id, username: user.username });
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {});
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json({ id: user.id, username: user.username });
  });

  app.get("/api/online-count", (_req, res) => {
    res.json({ count: connectedClients.size });
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    let userId: string | null = null;

    ws.send(JSON.stringify({ type: "online-count", count: connectedClients.size }));

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "authenticate") {
          userId = msg.userId as string;
          if (userId) {
            const existingWs = connectedClients.get(userId);
            if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
              existingWs.close();
            }
            connectedClients.set(userId, ws);
            broadcastOnlineCount();
            ws.send(JSON.stringify({ type: "authenticated", onlineCount: connectedClients.size }));
          }
          return;
        }

        if (!userId) return;

        switch (msg.type) {
          case "find-match": {
            removeFromQueue(userId);
            if (matchQueue.length > 0) {
              const partnerId = matchQueue.shift()!;
              const partnerWs = connectedClients.get(partnerId);
              if (partnerWs?.readyState === WebSocket.OPEN) {
                const roomId = crypto.randomUUID();
                rooms.set(roomId, [partnerId, userId]);
                partnerWs.send(JSON.stringify({ type: "matched", roomId, role: "initiator" }));
                ws.send(JSON.stringify({ type: "matched", roomId, role: "receiver" }));
              } else {
                connectedClients.delete(partnerId);
                matchQueue.push(userId);
                ws.send(JSON.stringify({ type: "searching", position: matchQueue.length }));
              }
            } else {
              matchQueue.push(userId);
              ws.send(JSON.stringify({ type: "searching", position: matchQueue.length }));
            }
            break;
          }

          case "cancel-match": {
            removeFromQueue(userId);
            ws.send(JSON.stringify({ type: "match-cancelled" }));
            break;
          }

          case "offer": {
            const partnerId = getPartnerUserId(msg.roomId, userId);
            if (partnerId) {
              const partnerWs = connectedClients.get(partnerId);
              if (partnerWs?.readyState === WebSocket.OPEN) {
                partnerWs.send(JSON.stringify({ type: "offer", offer: msg.offer, roomId: msg.roomId }));
              }
            }
            break;
          }

          case "answer": {
            const partnerId = getPartnerUserId(msg.roomId, userId);
            if (partnerId) {
              const partnerWs = connectedClients.get(partnerId);
              if (partnerWs?.readyState === WebSocket.OPEN) {
                partnerWs.send(JSON.stringify({ type: "answer", answer: msg.answer, roomId: msg.roomId }));
              }
            }
            break;
          }

          case "ice-candidate": {
            const partnerId = getPartnerUserId(msg.roomId, userId);
            if (partnerId) {
              const partnerWs = connectedClients.get(partnerId);
              if (partnerWs?.readyState === WebSocket.OPEN) {
                partnerWs.send(
                  JSON.stringify({ type: "ice-candidate", candidate: msg.candidate, roomId: msg.roomId })
                );
              }
            }
            break;
          }

          case "end-call": {
            const partnerId = getPartnerUserId(msg.roomId, userId);
            if (partnerId) {
              const partnerWs = connectedClients.get(partnerId);
              if (partnerWs?.readyState === WebSocket.OPEN) {
                partnerWs.send(JSON.stringify({ type: "peer-disconnected" }));
              }
            }
            rooms.delete(msg.roomId);
            break;
          }
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    });

    ws.on("close", () => {
      if (userId) handleDisconnect(userId);
    });

    ws.on("error", () => {
      if (userId) handleDisconnect(userId);
    });
  });

  return httpServer;
}
