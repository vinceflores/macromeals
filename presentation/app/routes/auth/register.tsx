import { data, redirect } from "react-router";
import { getSession, commitSession } from "../../sessions.server";
import type { Route } from "./+types/register";
import RegisterForm from "../../../components/register-form";

//prevent users who are already logged in from seeing the register page
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.has("access")) {
    return redirect("/home");
  }

  return data(
    { error: session.get("error") },
    {
      headers: { "Set-Cookie": await commitSession(session) },
    },
  );
}

//backend fetch
async function createUser(userData: Record<string, string>) {
  try {
    const res = await fetch(
      `${process.env.SERVER_URL}/api/accounts/register/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      },
    );

    console.log("DEBUG: Django Status Code:", res.status);

    if (res.status != 201) return null;

    console.log("DEBUG: Django Response Body:", data);

    return await res.json();
  } catch (error) {
    console.error("Error registering user: ", error);
    return null;
  }
}

//action

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const form = await request.formData();

  //extract user data
  const userData = {
    email: form.get("email") as string,
    first_name: form.get("first_name") as string,
    last_name: form.get("last_name") as string,
    password: form.get("password") as string,
  };

  const res = await createUser(userData);

  if (res == null) {
    session.flash("error", "Error creating user. Email may already be in use.");
    return redirect("/auth/login", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  //log user in if success
  session.set("access", res.access);
  session.set("refresh", res.refresh);

  return redirect("/home", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export default function Register() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <RegisterForm action="/auth/register" />
    </div>
  );
}
