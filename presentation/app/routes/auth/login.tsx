import LoginForm from "components/login-03";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/login";
import { data, redirect } from "react-router";

import {
    getSession,
    commitSession,
} from "../../sessions.server";


export async function loader({
    request,
}: Route.LoaderArgs) {
    const session = await getSession(
        request.headers.get("Cookie"),
    );

    const error = session.get("error");

    if (session.has("access")) {
        return redirect("/home");
    }

    return data(
        { error: session.get("error") },
        {
            headers: {
                "Set-Cookie": await commitSession(session),
            },
        },
    );
}

async function validateCredentials(email: string, password: string) {

    try {

        // const res = await fetch("http://localhost:8000/api/token/", {
        const res = await fetch(`${process.env.SERVER_URL}/api/auth/token/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        })
        if (res.status !== 200) {
            return null
        }
        const auth = await res.json()
        return { ...auth }
    } catch (error) {
        console.log({ error })
        return null
    }
}

export async function action({
    request,
}: Route.ActionArgs) {
    const session = await getSession(
        request.headers.get("Cookie"),
    );
    const form = await request.formData();
    const email = form.get("email");
    const password = form.get("password");

    const res = await validateCredentials(
        email as string,
        password as string,
    );

    if (res == null) {
        session.flash("error", "Invalid email/password");
        return redirect("/auth/login", {
            headers: {
                "Set-Cookie": await commitSession(session),
            },
        });
    }

    // session.set("userId", res.userId);
    session.set("access", res.access);
    session.set("refresh", res.refresh);
    return redirect("/home", {
        headers: {
            "Set-Cookie": await commitSession(session),
        },
    });
}

export default function Login() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center">
            <LoginForm action="/auth/login" />
        </div>
    )
}