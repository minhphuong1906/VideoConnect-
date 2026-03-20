import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { type InsertUser, type User } from "@shared/schema";

const DATA_DIR = path.join(process.cwd(), "server", "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

type StoredUser = User;

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readUsers(): Promise<StoredUser[]> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeUsers(users: StoredUser[]) {
  await ensureStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

function toUser(user: Partial<StoredUser> & Pick<StoredUser, "id" | "username" | "password">): StoredUser {
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    googleId: user.googleId ?? null,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    authProvider: user.authProvider ?? "local",
    rememberToken: user.rememberToken ?? null,
  };
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByRememberToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    id: string,
    updates: Partial<Omit<StoredUser, "id">>
  ): Promise<User | undefined>;
  setRememberToken(userId: string): Promise<string>;
  clearRememberToken(userId: string): Promise<void>;
  upsertGoogleUser(input: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }): Promise<User>;
}

class JsonStorage implements IStorage {
  async getUser(id: string) {
    const users = await readUsers();
    return users.find((user) => user.id === id);
  }

  async getUserByUsername(username: string) {
    const users = await readUsers();
    return users.find((user) => user.username === username);
  }

  async getUserByGoogleId(googleId: string) {
    const users = await readUsers();
    return users.find((user) => user.googleId === googleId);
  }

  async getUserByRememberToken(token: string) {
    const users = await readUsers();
    return users.find((user) => user.rememberToken === token);
  }

  async createUser(insertUser: InsertUser) {
    const users = await readUsers();

    const user = toUser({
      id: randomUUID(),
      username: insertUser.username,
      password: insertUser.password,
      googleId: insertUser.googleId ?? null,
      email: insertUser.email ?? null,
      displayName: insertUser.displayName ?? null,
      avatarUrl: insertUser.avatarUrl ?? null,
      authProvider: insertUser.authProvider ?? "local",
      rememberToken: insertUser.rememberToken ?? null,
    });

    users.push(user);
    await writeUsers(users);
    return user;
  }

  async updateUser(id: string, updates: Partial<Omit<StoredUser, "id">>) {
    const users = await readUsers();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return undefined;

    const current = users[index];
    const next = toUser({
      ...current,
      ...Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      ),
      id: current.id,
      username: current.username,
      password: current.password,
    });

    users[index] = next;
    await writeUsers(users);
    return next;
  }

  async setRememberToken(userId: string) {
    const token = randomUUID();
    await this.updateUser(userId, { rememberToken: token });
    return token;
  }

  async clearRememberToken(userId: string) {
    await this.updateUser(userId, { rememberToken: null });
  }

  async upsertGoogleUser(input: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
    const users = await readUsers();

    const existingIndex = users.findIndex(
      (user) =>
        user.googleId === input.googleId ||
        user.email === input.email ||
        user.username === input.email
    );

    if (existingIndex !== -1) {
      const updated = toUser({
        ...users[existingIndex],
        googleId: input.googleId,
        email: input.email,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        authProvider: "google",
      });

      users[existingIndex] = updated;
      await writeUsers(users);
      return updated;
    }

    const user = toUser({
      id: randomUUID(),
      username: input.email,
      password: randomUUID(),
      googleId: input.googleId,
      email: input.email,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      authProvider: "google",
      rememberToken: null,
    });

    users.push(user);
    await writeUsers(users);
    return user;
  }
}

export const storage = new JsonStorage();
