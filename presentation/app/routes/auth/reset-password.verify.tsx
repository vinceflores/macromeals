import { Label } from "~/components/ui/label";
import { Form, Link, redirect, useActionData, useFetcher, useNavigate, useParams, useSearchParams } from "react-router";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "~/components/ui/input-otp"
import type { Route } from ".react-router/types/app/routes/auth/+types/reset-password.verify";
import { ErrorFlag } from "components/error-flags";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";

export async function action(
    {params, request}: Route.ActionArgs
) {
    const data = await request.formData()
    const code = data.get('code')
    const email = data.get('email')
    console.log({email, code})
    // verify if code exists 
    const req = await fetch(`${process.env.SERVER_URL}/api/auth/password-reset/verify/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email, code
        })
    })

    if(req.status !== 200) {
        return {
            error: "Code Not Valid or Expired"
        }
    }
    return redirect(`/auth/reset-password/reset?email=${email}&code=${code}`)
}

export default function Verify() {
    const [s] = useSearchParams()
    const email = s.get('email')
    const data = useActionData()
    const [resend, setResend] = useState(false)
    const fetcher = useFetcher();
    let navigate = useNavigate();

    return <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-1 flex-col max-w-md justify-center px-4 py-10 lg:px-6">
            <div className="flex flex-start w-full">
                <Button variant={"link"} onClick={() => navigate(-1)}> <ArrowLeft /> Back </Button>
            </div>
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h3 className="text-balance text-center text-lg font-semibold text-foreground dark:text-foreground">
                    Verify Code
                </h3>
                <p className="text-center text-gray-800 text-sm"> for <span className="italic">{email}</span></p>
                <p className="text-pretty text-center text-sm text-muted-foreground dark:text-muted-foreground">
                    Enter 6-Digit Code
                </p>
                {data?.error && <ErrorFlag errorText={data.error} />}
                <Form method="post" className="mt-6 space-y-4">
                    <input hidden={true} value={email as string} name="email" />
                    <div className="w-full flex justify-center items-center">
                        <InputOTP name="code" maxLength={6} className="">
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <Button type="submit" className="mt-4 w-full py-2 font-medium">
                        Submit 6-digit Code
                    </Button>
                </Form>
                <fetcher.Form action={`/auth/reset-password/resend`} method="post" className="py-2 text-sm text-center">
                    <input hidden={true} value={email as string} name="email" />
                    Didn't get a code?  
                    <Button  onClick={() => setResend(true)} type="submit" variant="link" >
                            Resend Code
                    </Button>
                </fetcher.Form>
                {
                    resend && (
                        <div className="flex items-center-safe p-2 gap-2  capitalize bg-gray-500 text-white rounded-md">
                            <Check />
                            <p className=""> Code Resent </p>
                        </div>
                    ) 
                }
            </div>
        </div>
    </div>
}