import { redirect, type Session } from "react-router";
import { destroySession } from "~/sessions.server";

export async function Fetch(request: Request, session: Session) {
  const accessToken = session.get("access");
  const refreshToken = session.get("refresh");
  const initialRequest = request.clone();

  const server_url = process.env.SERVER_URL;
  let response = await fetch(request, {
    headers: {
      ...Object.fromEntries(request.headers),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshResponse = await fetch(`${server_url}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!refreshResponse.ok) {
    throw redirect("/auth/login", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }

  const data = await refreshResponse.json();
  const newAccessToken = data.access;

  return fetch(initialRequest, {
    headers: {
      ...Object.fromEntries(initialRequest.headers),
      Authorization: `Bearer ${newAccessToken}`,
    },
  });
}
