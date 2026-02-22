import { Button } from "~/components/ui/button"

import type { Route } from "./+types/home"
import Login05 from "components/login-05"
import {getSession } from "~/sessions.server";
import { redirect } from "react-router";
import { Fetch } from "~/lib/auth.server";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(
    request.headers.get("Cookie"),
  );
  if (session.data.access) {
    try {
      const res = await Fetch(
        new Request(`${process.env.SERVER_URL}/api/me/`),
        session
      )
      const me = await res.json()
      return me
    } catch (error) {
      throw error
    }
  }
  // return { email: "no email" }
  return redirect("auth/login")

}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      {/* <Login05 /> */}
      <h1>email: {loaderData.email}</h1>
      <Button>Click me</Button>
    </div>
  )
}