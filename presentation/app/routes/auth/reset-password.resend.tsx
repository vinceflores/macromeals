import type { Route } from ".react-router/types/app/routes/auth/+types/reset-password.resend";

export async function action({request}: Route.ActionArgs ) {
    const fd = await request.formData()
    const email = fd.get("email")
    const req = await fetch(`${process.env.SERVER_URL}/api/auth/password-reset/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
    })
    // if (req.status !== 200) {
    //     return {
    //         error: "Email not found"
    //     }
    // }
}

// export default function ResendCode() {
//     return (
//         <div className="flex items-center justify-center min-h-dvh">
//             <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
//                 <div className="sm:mx-auto sm:w-full sm:max-w-sm">
//                     <h3 className="text-balance text-center text-lg font-semibold text-foreground dark:text-foreground">
//                         Code Sent
//                     </h3>
//                     {/* <p className="text-pretty text-center text-sm text-muted-foreground dark:text-muted-foreground">

//                     </p> */}
//                 </div>
//             </div>
//         </div>
//     )
// }