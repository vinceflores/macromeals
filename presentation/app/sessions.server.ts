import { createCookieSessionStorage } from "react-router";
export { getSession, commitSession, destroySession };

type SessionData = {
  // userId: string;
  access: string;
  refresh: string;
};

type SessionFlashData = {
  error: string;
};

// TODO use a DB based like Redi for production
const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      // maxAge: 60,
      path: "/",
      sameSite: "lax",
      secrets: [process.env.APP_SECRET || ""], // To be
      secure: process.env.NODE_ENV === "production",
    },
  });



import { createThemeSessionResolver } from "remix-themes"

// You can default to 'development' if process.env.NODE_ENV is not set
const isProduction = process.env.NODE_ENV === "production"

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "theme",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secrets: ["s3cr3t"],
    // Set domain and secure only if in production
    ...(isProduction
      ? { domain: "your-production-domain.com", secure: true }
      : {}),
  },
})

export const themeSessionResolver = createThemeSessionResolver(sessionStorage)