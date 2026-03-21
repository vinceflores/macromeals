import { redirect } from "react-router"

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const date = url.searchParams.get("date")

  if (date) {
    return redirect(`/calendar?view=day&date=${date}`)
  }

  return redirect("/calendar?view=day")
}

export default function CurrentDayMacros() {
  return null
}
