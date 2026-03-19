import { Form, Link, redirect } from "react-router";
import {
    getSession,
    destroySession,
} from "../../sessions.server";
import type { Route } from "./+types/logout";

export async function action({
    request,
}: Route.ActionArgs) {
    const session = await getSession(
        request.headers.get("Cookie"),
    );
    return redirect("/", {
        headers: {
            "Set-Cookie": await destroySession(session),
        },
    });
}

// export default function LogoutRoute() {
//     return (
//         <>
//             <p>Are you sure you want to log out?</p>
//             <Form method="post">
//                 <button>Logout</button>
//             </Form>
//             <Link to="/">Never mind</Link>
//         </>
//     );
// }
