import { createCookieSessionStorage } from "react-router";
import { createThemeSessionResolver } from "remix-themes"
import { createSessionStorage } from "react-router";
import { redis } from "~/lib/redis.server";


// Persisting Session for Authentication

type SessionData = {
  access: string;
  refresh: string;
};

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sessionKey(id: string) {
  return `session:${id}`;
}

export type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } = createSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
      sameSite: "lax",
      secrets: [process.env.SESSION_SECRET!],
      secure: process.env.NODE_ENV === "production",
    },

    async createData(data, expires) {
      // crypto.randomUUID() is available in Node 14.17+ and all modern runtimes
      const id = crypto.randomUUID();
      const ttl = expires
        ? Math.floor((expires.getTime() - Date.now()) / 1000)
        : SESSION_TTL_SECONDS;
      await redis.setex(sessionKey(id), ttl, JSON.stringify(data));
      return id;
    },

    async readData(id) {
      console.log(`DEBUG: Attempting to read session ID: ${id}`);
      const raw = await redis.get(sessionKey(id));
      if (!raw) {
        console.error(`DEBUG: Session ID ${id} NOT FOUND in Redis.`);
        return null;
      }
      console.log(`DEBUG: Session ${id} successfully retrieved from Redis.`);
      return JSON.parse(raw) as SessionData;
    },

    async updateData(id, data, expires) {
      const ttl = expires
        ? Math.floor((expires.getTime() - Date.now()) / 1000)
        : SESSION_TTL_SECONDS;
      await redis.setex(sessionKey(id), ttl, JSON.stringify(data));
    },

    async deleteData(id) {
      await redis.del(sessionKey(id));
    },
  });

export { getSession, commitSession, destroySession };

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "theme",
    path: "/",
    httpOnly: true,
    sameSite: "none",
    secrets: [process.env.SESSION_SECRET || "s3cr3t"],
    secure: process.env.NODE_ENV === "production",
  },
})

export const themeSessionResolver = createThemeSessionResolver(sessionStorage)