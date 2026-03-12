
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "MacroMeals" },
    {
      name: "description",
      content: "Register for MacroMeals and navigate to recipes.",
    },
  ];
}


export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col min-h-screen">

      <main className="mx-auto w-full max-w-6xl p-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
      </main>
    </div>
  );
}
