import { Label } from "~/components/ui/label"
import { useState } from "react"
import { Form, Link, redirect, useActionData } from "react-router"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import type { Route } from ".react-router/types/app/routes/auth/+types/reset-password"
import { ArrowLeft, TriangleAlert } from "lucide-react"
import { ErrorFlag } from "components/error-flags"
import { useNavigate } from "react-router";

export async function action({ request }: Route.ActionArgs) {
    const data = await request.formData()
    const email = data.get("email")
    const req = await fetch(`${process.env.SERVER_URL}/api/auth/password-reset/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
    })
    if (req.status !== 200) {
        return {
            error: "Email not found"
        }
    }
    return redirect(`/auth/reset-password/verify?email=${email}`)
}

export default function ResetPasswordPage() {
    const [codeSent, setCodeSent] = useState(false)
    const data = useActionData()
    let navigate = useNavigate();
    return (

        
        <div className="flex items-center justify-center min-h-dvh">
        
            <div className="flex flex-1 flex-col max-w-md  justify-center px-4 py-10 lg:px-6">
                <div className="flex flex-start w-full">
                    <Button variant={"link"} onClick={() => navigate(-1)}> <ArrowLeft /> Back </Button>
                </div>
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                    <h3 className="text-balance text-center text-lg font-semibold text-foreground dark:text-foreground">
                        Reset Password
                    </h3>
                    <p className="text-pretty text-center text-sm text-muted-foreground dark:text-muted-foreground">
                        Enter your email
                    </p>
                    {data?.error && <ErrorFlag errorText={data.error} />}
                    <Form action="/auth/reset-password" method="post" className="mt-6 space-y-4">
                        <div>
                            <Label
                                htmlFor="email-login-03"
                                className="text-sm font-medium text-foreground dark:text-foreground"
                            >
                                Email
                            </Label>
                            <Input
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="email"
                                placeholder="ephraim@blocks.so"
                                className="mt-2"
                            />
                        </div>
                        <Button type="submit" className="mt-4 w-full py-2 font-medium">
                            Send Code
                        </Button>
                    </Form>
                </div>
            </div>
        </div>
    )
}