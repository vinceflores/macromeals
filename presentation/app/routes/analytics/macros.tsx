import type { Route } from ".react-router/types/app/routes/analytics/+types/macros"
import { CaloriesStat, MacroStats, WaterStat } from "components/charts/macro-stats"
import { ArrowLeft, ArrowRight, Factory } from "lucide-react"
import { data, Link, redirect, useLoaderData, useNavigate } from "react-router"
import { Button } from "~/components/ui/button"
import type { ChartConfig } from "~/components/ui/chart"
import { Fetch } from "~/lib/auth.server"
import { getSession } from "~/sessions.server"
import { useSearchParams } from "react-router"
import { getLocalToday } from "~/lib/date"

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

    //get date from url - default is today
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || getLocalToday();


    try {
        const res = await Fetch(
            new Request(`${process.env.SERVER_URL}/api/analytics/progress/?date=${date}`, {
                headers: {
                    "Content-Type": "application/json"
                }
            }),
            session,
        );
        const macros = await res.json()
        return data({ ...macros, currentDate: date, error: undefined })
    } catch (error) {
        console.log(error)
        return data({ error: error })
    }
    
}

export default function CurrentDayMacros() {
    const macrosResult = useLoaderData<typeof loader>()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    if (macrosResult.error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-full max-w-4xl space-y-3 mx-auto my-10">
                <h1>An error Occurred</h1>
                <Button variant={"link"} onClick={() => navigate(-1)}> <ArrowLeft className="h-3" /> Go back </Button>
            </div>
        )
    }

    const { currentDate } = macrosResult; 

    //date nav
        const isToday = currentDate === new Date().toLocaleDateString('en-CA');    function navigateDate(days: number) {
        const date = new Date(currentDate + "T00:00:00");
        date.setDate(date.getDate() + days);

        const localTodayString = new Date().toLocaleDateString('en-CA');
        const targetDateString = date.toLocaleDateString('en-CA');

            
        if (targetDateString > localTodayString) return;

        const next = new URLSearchParams(searchParams);
        next.set("date", date.toLocaleDateString('en-CA'));
        setSearchParams(next, { replace: true});
    }

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


    return macrosResult.error ? (
        <div className="flex flex-col items-center justify-center h-screen w-full max-w-4xl space-y-3 mx-auto   my-10">
            <h1>An error Occured</h1>
            <Button variant={"link"} onClick={() => navigate(-1)}> <ArrowLeft className="h-3" /> Go back </Button>
        </div>
    ) : (
        <section className="w-full h-screen max-w-4xl space-y-4 mx-auto py-10">
        <div className="flex items-center justify-between bg-card border rounded-lg p-2 shadow-sm w-full">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigateDate(-1)}
                className="px-3"
            >
                ←
            </Button>
            <span className="font-medium text-center flex-1">
                {isToday ? "Today" : new Date(currentDate + "T00:00:00").toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                })}
            </span>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigateDate(1)}
                disabled={isToday}
                className="px-3"
            >
                →
            </Button>
        </div>

        
            <div>
                <h1 className="text-3xl font-bold">Progress Today </h1>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <CaloriesStat
                title="consumed"
                current={macrosResult.current.calories}
                goal={macrosResult.goal.calories}
                color={macrosResult.goal.calories > macrosResult.current.calories ? "var(--chart-2)" : "var(--chart-1)"}
                />
                <CaloriesStat 
                title="Remaining" 
                current={Math.max(0, macrosResult.goal.calories - macrosResult.current.calories)} 
                goal={macrosResult.goal.calories} 
                color="var(--chart-5)" 
                 />
                <WaterStat
                    title="water"
                    current={macrosResult.current.water}
                    goal={macrosResult.goal.water}
                />
                <MacroStats title="Macro Nutrients"
                    data={
                        {
                            carbs: {
                                current: macrosResult.current.carbohydrates,
                                goal: macrosResult.goal.carbohydrates
                            },
                            fat: {
                                current: macrosResult.current.fat,
                                goal: macrosResult.goal.fat
                            },
                            protein: {
                                current: macrosResult.current.protein,
                                goal: macrosResult.goal.protein
                            },
                        }
                    }

                />
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold"> Meals today </h1>
                <Link to={`/analytics/logging?mode=simple&date=${currentDate}`} className="flex items-center" > Go to meals <ArrowRight className="h-3" /> </Link>
            </div>
        </section>
    )
}
