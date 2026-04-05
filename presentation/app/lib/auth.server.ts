import { redirect, type Session } from "react-router";
import { commitSession, destroySession } from "~/sessions.server";

export async function Fetch(request: Request, session: Session) {
  const accessToken = await session.get("access");
  const refreshToken = await session.get("refresh");
  const body = request.method !== "GET" ? await request.text() : undefined;
  
  let headers = {
      ...Object.fromEntries(request.headers),
      Authorization: `Bearer ${accessToken}`,
      // "Content-Type": "application/json"
  }
  const server_url = process.env.SERVER_URL;
  let response = await fetch(request.url, {
    method: request.method,
    headers: headers,
    body
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

  session.set("access", newAccessToken)
  // await commitSession(session)

  // return fetch(initialRequest, {
  //   headers: {
  //     ...Object.fromEntries(initialRequest.headers),
  //     Authorization: `Bearer ${newAccessToken}`,
  //   },
  // });
  const retryResponse = await fetch(request.url, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      Authorization: `Bearer ${newAccessToken}`,
      // "Content-Type": "application/json"
    },
    body
  });

  // Attach the updated session cookie to the response
  const newResponse = new Response(retryResponse.body, retryResponse);
  newResponse.headers.append("Set-Cookie", await commitSession(session));

  return newResponse;
}