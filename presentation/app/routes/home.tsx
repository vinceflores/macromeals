import { Link } from "react-router"

import type { Route } from "./+types/home"
import Login05 from "components/login-05"
import { getSession } from "~/sessions.server";
import { redirect } from "react-router";
import { Fetch } from "~/lib/auth.server";
import { Button } from "~/components/ui/button";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "MacroMeals" },
    { name: "description", content: "Register for MacroMeals and navigate to recipes." },
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
  return redirect("/auth/login")

}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-end">
        <Link to="/recipes" className="rounded border px-4 py-2 text-sm font-medium">
          Go to Recipes
        </Link>
      </div>
      <h1>email: {loaderData.email}</h1>
      <Button>Click me</Button>
    </main>
  )
}
