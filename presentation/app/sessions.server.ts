import { createCookieSessionStorage } from "react-router";

type SessionData = {
  // userId: string;
  access: string
  refresh: string
};

type SessionFlashData = {
  error: string;
};


// TODO use a DB based like Redi for production
const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>(
    {
      cookie: {
        name: "__session",
        httpOnly: true,
        // maxAge: 60,
        path: "/",
        sameSite: "lax",
        secrets: [process.env.APP_SECRET || ""], // To be 
        secure: process.env.NODE_ENV === "production",
      },
    },
  );

export { getSession, commitSession, destroySession };
