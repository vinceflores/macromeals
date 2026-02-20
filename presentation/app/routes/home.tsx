import { Link } from "react-router"

import type { Route } from "./+types/home"
import Login05 from "components/login-05"

export function meta(_: Route.MetaArgs) {
  return [
    { title: "MacroMeals" },
    { name: "description", content: "Register for MacroMeals and navigate to recipes." },
  ]
}

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-end">
        <Link to="/recipes" className="rounded border px-4 py-2 text-sm font-medium">
          Go to Recipes
        </Link>
      </div>
      <Login05 />
    </main>
  )
}
