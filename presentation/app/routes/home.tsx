import { Link, redirect } from "react-router";
import type { Route } from "./+types/home";
import { getSession } from "~/sessions.server";
import { Fetch } from "~/lib/auth.server";
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

    <div className="flex flex-col min-h-screen">


      <main className="mx-auto w-full max-w-6xl p-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {fullName}</p>
          <p className="text-muted-foreground">Logged in as: {loaderData.email}</p>

       
      </main>
    </div>
  );
}