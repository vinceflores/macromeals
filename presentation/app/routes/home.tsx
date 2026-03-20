/**
 * routes/home.tsx
 *
 * Dashboard. Shows a persistent onboarding banner if the user hasn't
 * completed the goals quiz yet.
 */

import { Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { getSession } from "~/sessions.server";
import { Fetch } from "~/lib/auth.server";
import { Button } from "~/components/ui/button";
import { CaloriesStat, WaterStat } from "components/charts/macro-stats";
import { getLocalToday } from "~/lib/date";


export function meta(_: Route.MetaArgs) {
  return [
    { title: "MacroMeals" },
    { name: "description", content: "MacroMeals dashboard" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  const url = new URL(request.url);
  const today = getLocalToday();


  const [profileRes, macrosRes] = await Promise.all([
    Fetch(new Request(`${process.env.SERVER_URL}/api/accounts/profile/`), session),
    Fetch(new Request(`${process.env.SERVER_URL}/api/analytics/progress/?date=${today}`), session)
  ]);

  

  const me = await profileRes.json();
  const macros = await macrosRes.json();

  return { me, macros};
}

export default function Home({ loaderData }: Route.ComponentProps) {

  const {me, macros} = useLoaderData<typeof loader>();


  const fullName = [me?.first_name, me?.last_name].filter(Boolean).join(" ") || "User";
  const showOnboardingBanner = !me?.onboarding_complete;

  const consumed = macros.current.calories;
  const goal = macros.goal.calories;

  
  const remainingValue = Math.max(0, macros.goal.calories - macros.current.calories);
  const remainingData = [{
    calories: remainingValue,
    current: remainingValue,
    goal: macros.goal.calories,
    unit: "kcal",
    fill: "var(--chart-1)" 
  }];


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
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Welcome, {me.first_name}!</p>
          
          <br></br>
          <h2 className="text-3xl font-bold tracking-tight">Current Progress</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CaloriesStat 
          title="consumed" 
          current={consumed} 
          goal={goal} 
          color={consumed > goal ? "var(--chart-1)" : "var(--chart-2)"} 
        />
        <CaloriesStat 
          title="Remaining" 
          current={remainingValue} 
          goal={goal} 
          color="var(--chart-5)" 
        />
        <WaterStat 
          title="Water" 
          current={macros.current.water} 
          goal={macros.goal.water} 
        />
      </div>

      </main>
    </div>
  );
}
