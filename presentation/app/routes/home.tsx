
import type { Route } from "./+types/home";
import { getSession } from "~/sessions.server";
import { Fetch } from "~/lib/auth.server";
import { Link } from "react-router";
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
  console.log("Fetching from:", process.env.SERVER_URL)
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

      <main className="mx-auto w-full max-w-6xl p-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>

        <a href="/analytics/logging" className="text-red-500 font-bold underline">
  FORCE NAVIGATE TO MEALS
</a>


      </main>
    </div>
  );
}
