import type { Route } from ".react-router/types/app/routes/analytics/+types/macros"
import { ArrowLeft, ArrowRight, Factory } from "lucide-react"
import { data, Link, redirect, useLoaderData, useNavigate } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Fetch } from "~/lib/auth.server"
import { getSession } from "~/sessions.server"



export type Macros = {
    calories: number,
    fat: number,
    protein: number,
    carbohydrates: number
    water: number
}

export type MacroGoals = {
    goal: Macros,
    current: Macros
}

export async function loader({request}: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    if (!session.data.access) return redirect("/auth/login");
    try {
        const res = await Fetch(
            new Request(`${process.env.SERVER_URL}/api/analytics/progress/`, {
                headers: {
                    "Content-Type": "application/json"
                }
            }),
            session,
        ); 
        const macros = await res.json()
        return data({ ...macros, error: undefined })
    } catch (error) {
        console.log(error)
        return data({error: error})
    }
    // const macros: MacroGoals = {
    //     current: {
    //         calories: 1000,
    //         fat: 10.12,
    //         protein: 67.8,
    //         carbohydrates: 50.5,
    //         water: 1000
    //     },
    //     goal: {
    //         calories: 2000,
    //         fat: 2000 * 0.25, // 25%
    //         protein: 2000 * .30,// 30%
    //         carbohydrates: 2000 * .45, // 46%
    //         water: 2500 // 2500ml
    //     }
    // }
    // return data({ ...macros, error: undefined })
}

export default function CurrentDayMacros() {
    const data = useLoaderData<typeof loader>()
    const navigate = useNavigate()
    return data.error ? (
        <div className="flex flex-col items-center justify-center h-screen w-full max-w-4xl space-y-3 mx-auto   my-10">
            <h1>An error Occured</h1>
            <Button variant={"link"} onClick={() => navigate(-1)}> <ArrowLeft className="h-3" /> Go back </Button>
        </div>
    ): (
        <section className="w-full h-full max-w-4xl space-y-3 mx-auto   my-10">
            <div>
                <h1 className="text-3xl font-bold">Progress Today </h1>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Calories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{data.current.calories} / {data.goal.calories} kcal</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Macro Nutrients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p> Carbs {data.current.carbohydrates} / {data.goal.carbohydrates} g</p>
                        <p> Fat {data.current.fat} / {data.goal.fat} g</p>
                        <p> Protein {data.current.protein} / {data.goal.protein} g</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Water Intake</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{data.current.water} / {data.goal.water} ml</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold"> Meals today </h1>
                <Link to="#" className="flex items-center" > Go to meals <ArrowRight className="h-3" /> </Link>
            </div>
        </section>
    )
}