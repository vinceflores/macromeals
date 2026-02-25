import type { Route } from ".react-router/types/app/layouts/+types/protected_routes";
import { Outlet } from "react-router";
// import { getSession } from "../sessions.server";

// export async function loader({ request }: Route.LoaderArgs) {
//     const session = await getSession(
//         request.headers.get("Cookie"),
//     );
//     return session.data
// }

export default function ProtectedRoutesLayout({ loaderData }: Route.ComponentProps) {
    // return <ProtectedRouteProvider> <Outlet /> </ProtectedRouteProvider>
    return <Outlet />
}

// function ProtectedRouteProvider({ children }: { children: React.ReactNode }) {
//     return <div> {children} </div>
// }