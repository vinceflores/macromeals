import { Link } from "react-router";

import type { Route } from "./+types/home";
import Login05 from "components/login-05";
import { getSession } from "~/sessions.server";
import { redirect } from "react-router";
import { Fetch } from "~/lib/auth.server";
import { Button } from "~/components/ui/button";
import AppHeader from "../../components/app-header";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "MacroMeals" },
    {
      name: "description",
      content: "Register for MacroMeals and navigate to recipes.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.data.access) {
    try {
      const res = await Fetch(
        new Request(`${process.env.SERVER_URL}/api/accounts/profile/`),
        session,
      );
      const me = await res.json();
      return me;
    } catch (error) {
      throw error;
    }
  }
  // return { email: "no email" }
  return redirect("/auth/login");
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader
        profile={{
          email: loaderData.email,
          first_name: loaderData.first_name,
          last_name: loaderData.last_name,
        }}
        showHome={false}
      >
        <Link
          to="/recipes"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Go to Recipes
        </Link>

        <Link
          to="/analytics/macros"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Daily Progress
        </Link>
      </AppHeader>

      <main className="mx-auto w-full max-w-6xl p-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Logged in as: {loaderData.email}
          </p>
          <Button>Click me</Button>
        </div>
      </main>
    </div>
  );
}
