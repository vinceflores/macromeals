import type { Route } from ".react-router/types/app/routes/auth/+types/reset-password.reset";
import { isRouteErrorResponse, Link, redirect, useActionData, useNavigate, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { data } from "react-router";
import { ErrorFlag } from "components/error-flags";
import { ArrowLeft } from "lucide-react";

export async function action({request}: Route.ActionArgs) {
    const fd = await request.formData()
    const code = fd.get('code')
    const email = fd.get('email')
    const p1 = fd.get('password')
    const p2 = fd.get('confirm-password')

    if(p1 !== p2) {
        return {
            error: "Passwords Do not match"
        }
    }

    const req = await fetch(`${process.env.SERVER_URL}/api/auth/password-reset/confirm/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email, code, new_password: p1
        })
    })

    if(req.status !== 200){
        throw data("An Error has Occured", req.status)
    }
    
    return redirect("/auth/login")
}

export default function RssetPassword(){
    const [s] = useSearchParams()
    const actionDat = useActionData()
    let navigate = useNavigate();
    return (
        <div className="flex items-center justify-center min-h-dvh">
            <div className="flex flex-1 flex-col max-w-md justify-center px-4 py-10 lg:px-6">
                <div className="flex flex-start w-full">
                    <Button variant={"link"} onClick={() => navigate(-1)}> <ArrowLeft /> Back </Button>
                </div>
                <Card className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
                    <CardHeader> 
                        <CardTitle className="text-center"> Reset Password </CardTitle>
                        <CardDescription className="text-center" > for <span className="italic">{s.get('email')}</span> </CardDescription>
                        {actionDat?.error && <ErrorFlag errorText={actionDat.error} />}
                    </CardHeader>
                    <CardContent>
                        
                        <form action="#" method="post" className="space-y-4">
                            <div>
                                <Label
                                    htmlFor="password-login-05"
                                    className="text-sm font-medium text-foreground dark:text-foreground"
                                >
                                    New Password
                                </Label>
                                <Input
                                    type="password"
                                    id="password-login-05"
                                    name="password"
                                    autoComplete="password-login-05"
                                    placeholder="Password"
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="confirm-password-login-05"
                                    className="text-sm font-medium text-foreground dark:text-foreground"
                                >
                                    Confirm password
                                </Label>
                                <Input
                                    type="password"
                                    id="confirm-password-login-05"
                                    name="confirm-password"
                                    autoComplete="confirm-password-login-05"
                                    placeholder="Password"
                                    className="mt-2"
                                />
                            </div>

                            <input hidden name="code" type="number" value={s.get('code') as string}/>
                            <input hidden name="email" type="email" value={s.get('email') as string} />
                            
                            <Button type="submit" className="mt-4 w-full py-2 font-medium">
                                Submit
                            </Button>

                        </form>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}



export function ErrorBoundary({
    error,
}: Route.ErrorBoundaryProps) {
    if (isRouteErrorResponse(error)) {
        return (
            <>
                <h1>
                    {error.status} {error.statusText}
                </h1>
                <p>{error.data}</p>
                <Link to="/auth/login">Go to Login </Link>
            </>
        );
    } else if (error instanceof Error) {
        return (
            <div>
                <h1>Error</h1>
                <p>{error.message}</p>
                <p>The stack trace is:</p>
                <pre>{error.stack}</pre>
            </div>
        );
    } else {
        return <h1>Unknown Error</h1>;
    }
}
