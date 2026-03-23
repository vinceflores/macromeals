import type { Route } from ".react-router/types/app/layouts/+types/protected_routes";
import AppHeader from "components/app-header";
import { data, Link, Outlet, redirect, useSearchParams } from "react-router";
import { Fetch } from "~/lib/auth.server";
import { getSession } from "~/sessions.server";

export async function loader({ request }: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    if (session.data.access) {
        try {
            const res = await Fetch(
                new Request(`${process.env.SERVER_URL}/api/accounts/profile/`),
                session,
            );
            const me = await res.json();
            return data(me, {
                headers: {
                    "Set-Cookie": res.headers.get("Set-Cookie") as string
                }
            });
        } catch (error) {
            throw error;
        }
    }
    return redirect("/auth/login");
}

export default function ProtectedRoutesLayout({ loaderData }: Route.ComponentProps) {
    const [searchParams] = useSearchParams();

    const localToday = new Date().toLocaleDateString('en-CA');
    const currentDate = searchParams.get("date") || localToday;
    const links = [
        {
            to: "/recipes/search/external/",
            label: "Browse Recipes"
        },
        {
            to: "/recipes",
            label: "My Recipes"
        },
        {
            to: "/calendar",
            label: "Open Calendar",
        },
        {
            to: `/analytics/macros?date=${currentDate}`,
            label: "Daily Progress"
        },
        {
            to: `/analytics/logging?mode=recipe&date=${currentDate}`,
            label: "Meal Logging"
        }
        
    ]
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
            {/* <Link
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
            </Link> */}
            {
                links.map((i, k) => (
                    <Link
                        key={k}
                        to={i.to}
                        className=" px-4 py-2 text-sm font-medium hover:text-green-500 "
                    >
                        {i.label}
                    </Link>
                ))
            }
        </AppHeader>
        <Outlet />
    </>
);
}

// function ProtectedRouteProvider({ children }: { children: React.ReactNode }) {
//     return <div> {children} </div>
// }