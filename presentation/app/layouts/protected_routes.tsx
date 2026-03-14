import type { Route } from ".react-router/types/app/layouts/+types/protected_routes";
import AppHeader from "components/app-header";
import { Link, Outlet, redirect, useSearchParams} from "react-router";
import { Fetch } from "~/lib/auth.server";
import { getSession } from "~/sessions.server";
// import { getSession } from "../sessions.server";

export async function loader({ request }: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"));
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

export default function ProtectedRoutesLayout({ loaderData }: Route.ComponentProps) {
    const [searchParams] = useSearchParams();
    
    const localToday = new Date().toLocaleDateString('en-CA');
    const currentDate = searchParams.get("date") || localToday;

    return (
        <>
            <AppHeader
                profile={{
                    email: loaderData.email,
                    first_name: loaderData.first_name,
                    last_name: loaderData.last_name,
                }}
                showHome={false}
            >
                <Link 
                    to="/recipes/search/external/"
                    className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
                    >Browse Recipes
                </Link>

                <Link
                    to="/recipes"
                    className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                    My Recipes
                </Link>

                <Link
                to="/calendar"
                className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                Open Calendar
                </Link>

                <Link
                    to={`/analytics/macros?date=${currentDate}`}
                    className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                    Daily Progress
                </Link>
                <Link
                    to={`/analytics/logging?mode=recipe&date=${currentDate}`}
                    className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                    Meal Logging
                </Link>
            </AppHeader>
            <Outlet />
        </>
    );
}

// function ProtectedRouteProvider({ children }: { children: React.ReactNode }) {
//     return <div> {children} </div>
// }