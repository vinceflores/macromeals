import { Link, redirect } from "react-router";
import type { Route } from "./+types/home";
import { getSession } from "~/sessions.server";
import { Fetch } from "~/lib/auth.server";
import { Button } from "~/components/ui/button";
import AppHeader from "../../components/app-header";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "MacroMeals" },
    {
      name: "description",
      content: "MacroMeals dashboard",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.data.access) {
    return redirect("/auth/login");
  }

  const res = await Fetch(
    new Request(`${process.env.SERVER_URL}/api/accounts/profile/`),
    session,
  );

  const me = await res.json();
  return me;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const fullName =
    [loaderData.first_name, loaderData.last_name].filter(Boolean).join(" ") ||
    "User";

  return (
    <div className="flex min-h-screen flex-col">
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
          to="/calendar"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Open Calendar
        </Link>

        <Link
          to="/analytics/macros"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Daily Progress
        </Link>

        <Link
          to="/analytics/logging?mode=recipe"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Meal Logging
        </Link>
      </AppHeader>

      <main className="mx-auto w-full max-w-6xl p-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {fullName}</p>
          <p className="text-muted-foreground">Logged in as: {loaderData.email}</p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/recipes">
              <Button>Recipes</Button>
            </Link>

            <Link to="/calendar">
              <Button variant="outline">Calendar</Button>
            </Link>

            <Link to="/analytics/macros">
              <Button variant="outline">Daily Progress</Button>
            </Link>

            <Link to="/analytics/logging?mode=recipe">
              <Button variant="outline">Meal Logging</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}