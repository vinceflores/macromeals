import type { Route } from ".react-router/types/app/routes/analytics/+types/water_log";
import { data } from "react-router";
import { Fetch } from "~/lib/auth.server";
import { getSession } from "~/sessions.server";

export async function action({ request }: Route.ActionArgs) {
    const session = await getSession(
        request.headers.get("Cookie")
    )
    const fd = await request.formData()
    const date_logged = fd.get("date")
    const water = fd.get("water")
    const req = new Request(`${process.env.SERVER_URL}/api/logging/water/`, {
        method: "POST",
        body: JSON.stringify({ water, date_logged }),
        headers: {
            "Content-Type": "application/json"
        }
    })
    const res = await Fetch(req, session)
    if (res.status !== 201)
        return data({ error: "Log Failed", success: false })
    return data({ success: true, error: undefined })

}