import type { Route } from ".react-router/types/app/routes/analytics/+types/macros"
import { CaloriesStat, MacroStats, WaterStat } from "components/charts/macro-stats"
import { ArrowLeft, ArrowRight, Factory } from "lucide-react"
import { data, Link, redirect, useLoaderData, useNavigate } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import type { ChartConfig } from "~/components/ui/chart"
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

export async function loader({ request }: Route.LoaderArgs) {
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
        return data({ error: error })
    }
    
}

export default function CurrentDayMacros() {
    const data = useLoaderData<typeof loader>()
    const navigate = useNavigate()

    const caloriesConfig = {
        calories: {
            label: "calories",
            color: "var(--chart-2)",
        },
    } satisfies ChartConfig
    const waterConfig = {
        water: {
            label: "water",
            color: "var(--chart-4)",
        },
    } satisfies ChartConfig


    return data.error ? (
        <div className="flex flex-col items-center justify-center h-screen w-full max-w-4xl space-y-3 mx-auto   my-10">
            <h1>An error Occured</h1>
            <Button variant={"link"} onClick={() => navigate(-1)}> <ArrowLeft className="h-3" /> Go back </Button>
        </div>
    ) : (
        <section className="w-full h-screen max-w-4xl space-y-3 mx-auto   py-19">
            <div>
                <h1 className="text-3xl font-bold">Progress Today </h1>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <CaloriesStat
                    chartConfig={caloriesConfig}
                    title="calories"
                    chartData={
                        [
                            {
                                calories: data.current.calories,
                                current: data.current.calories,
                                goal: data.goal.calories,
                                unit: "kcal",
                                fill: data.goal.calories > data.current.calories ? "var(--chart-2)" : "var(--chart-1)"
                            }
                        ]
                    }
                />
                <WaterStat
                    title="water"
                    current={data.current.water}
                    goal={data.goal.water}
                />
                <MacroStats title="Macro Nutrients"
                    data={
                        {
                            carbs: {
                                current: data.current.carbohydrates,
                                goal: data.goal.carbohydrates
                            },
                            fat: {
                                current: data.current.fat,
                                goal: data.goal.fat
                            },
                            protein: {
                                current: data.current.protein,
                                goal: data.goal.protein
                            },
                        }
                    }

                />
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold"> Meals today </h1>
                <Link to="/analytics/logging" className="flex items-center" > Go to meals <ArrowRight className="h-3" /> </Link>
            </div>
        </section>
    )
}
