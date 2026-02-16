import { Button } from "~/components/ui/button"

import type { Route } from "./+types/home"
import Login05 from "components/login-05"

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ]
}

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <Login05 />
      <Button>Click me</Button>
    </div>
  )
}