/**
 * routes/home.tsx
 *
 * Dashboard. Shows a persistent onboarding banner if the user hasn't
 * completed the goals quiz yet.
 */

import { Link, redirect } from "react-router";
import type { Route } from "./+types/home";
import { getSession } from "~/sessions.server";
import { Fetch } from "~/lib/auth.server";
import { Button } from "~/components/ui/button";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "MacroMeals" },
    { name: "description", content: "MacroMeals dashboard" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

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

  const showOnboardingBanner = !loaderData.onboarding_complete;

  return (
    <div className="flex flex-col min-h-screen">
      <main className="mx-auto w-full max-w-6xl p-6 space-y-6">

        {/* ── Onboarding banner ─────────────────────────────────────────── */}
        {showOnboardingBanner && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
            <div className="space-y-0.5">
              <p className="font-semibold text-primary">
                🎯 Set up your personalised nutrition goals
              </p>
              <p className="text-sm text-muted-foreground">
                Take a 2-minute quiz so we can calculate your recommended
                daily calories and macros.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/onboarding">Start Quiz</Link>
            </Button>
          </div>
        )}

        {/* ── Welcome ───────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {fullName}</p>
          <p className="text-muted-foreground">Logged in as: {loaderData.email}</p>
        </div>

      </main>
    </div>
  );
}
