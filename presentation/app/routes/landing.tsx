import type { Route } from ".react-router/types/app/+types/root"
import { ModeToggle } from "components/mode-toggle"
import { Github } from "lucide-react"

import { data, Link, useLoaderData } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { getSession } from "~/sessions.server"


export async function loader({ request }: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"))
    if (!session.get("access") && !session.get("refresh")) {
        return data({ auth: false })
    } else {
        return data({ auth: true })
    }
}
export function shouldRevalidate() {
    return true;
}

export default function Landing() {
    const loaderData = useLoaderData<typeof loader>()
    return (
        <div className="mx-auto min-h-screen max-w-6xl px-6 justify-between">
            {/* Navbar */}
            <Navbar auth={loaderData.auth} />
            {/* Hero */}
            <div className="w-full min-h-[400px] flex py-12 flex-col items-center justify-center">
                <div className="rounded-full text-[8pt] bg-gray-500 dark:bg-gray-800 text-white py-1 px-3">
                    EECS 4314 Project, by Group 11
                </div>
                <h1 className="py-2 font-semibold text-7xl text-center ">Your nutrition, {" "}
                    <span className="text-green-500">simplified</span>.
                </h1>
                <h2 className="py-2 text-xl text-center text-gray-500 ">
                    From meal tracking to macro goals — everything you need
                    <span className="block"> to eat smarter, in one app.  </span>
                </h2>
                <Button asChild className="my-2">
                    <Link to="/home"> Get Started </Link>
                </Button>
            </div>
            {/* Featuers */}
            <div className="  min-h-[400px] grid grid-cols-3  rounded-3xl gap-4 p-3 py-16">
                <FeatureCard
                    title="Browse Recipes"
                    description="Browse thousands of recipes, save your favourites, 
                                and instantly see a full macro breakdown."
                />

                <FeatureCard
                    title=" Set Your Daily Goals"
                    description="Customise your daily targets for calories, protein, 
      carbs, fat, and water — all in one place."
                />
                <FeatureCard
                    title="Meal Calendar"
                    description="Log your meals day by day and stay consistent 
                                with a clear view of your eating habits."
                />
                <FeatureCard
                    title="Progress Insights"
                    description="Track your weekly and daily intake over time 
                                and see how your diet is improving."
                />
            </div>
            <CTASection />
            {/* FAQ */}
            {/* Footer */}
            <footer className=" border-t mx-auto w-full max-w-6xl px-6 pb-4 pt-2 flex justify-between items-center">
                <p className="text-xs">© 2026 Group 11. All Rights Reserved </p>
                <div className="flex justify-start items-center gap-2">
                    <Link to="#" className=" hover:text-green-500 px-3"> Terms of Service </Link>
                    <Link to="#" className=" hover:text-green-500 px-3 "> Privacy Policy </Link>
                    <Link to="#" className=" hover:text-green-500 px-3 "> Support </Link>
                </div>
                <div className=" text-xs flex items-center gap-2">
                    <p>LE/EECS4314</p>
                    <Button asChild variant={"outline"} size={"icon"}>
                        <a href="https://github.com/vinceflores/macromeals"> <Github /> </a>
                    </Button>
                </div>
            </footer>
        </div>
    )
}

export function CTASection() {
    return (
        <section className="relative overflow-hidden py-24 px-6">
            {/* Background glow effects */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[400px] w-[600px] rounded-full bg-green-500/10 blur-[120px]" />
            </div>

            {/* Subtle grid overlay */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            <div className="relative mx-auto max-w-3xl text-center">
                {/* Eyebrow */}
                <span className="mb-4 inline-block rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1 text-sm font-medium text-green-400">
                    Free to get started
                </span>

                {/* Heading */}
                <h2 className="mt-4 text-4xl font-bold tracking-tight text-black dark:text-white sm:text-5xl">
                    Ready to take control{" "}
                    <span className="block text-green-500 dark:text-green-400">of your nutrition?</span>
                </h2>

                {/* Subtext */}
                <p className="mt-6 text-lg leading-relaxed text-gray-900 dark:text-zinc-400">
                    Join thousands of users tracking their macros, hitting their goals,
                    and building better habits.
                </p>

                {/* CTAs */}
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Button
                        asChild
                        size="lg"
                        className="bg-green-500 px-8 text-black hover:bg-green-400"
                    >
                        <Link to="/auth/register">Get started for free</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="px-8">
                        <Link to="/auth/login">Log in</Link>
                    </Button>
                </div>

                {/* Social proof */}
                <p className="mt-8 text-sm text-zinc-500">
                    No credit card required &mdash; just macros.
                </p>
            </div>
        </section>
    )
}

type FeatureCardProps = {
    title: string
    description: string
}
export function FeatureCard(props: FeatureCardProps) {
    return (
        <Card className="" >
            <CardHeader className="">
                <CardTitle className=""> {props.title} </CardTitle>
                <CardDescription className="text-shadow-muted" >{props.description} </CardDescription>
            </CardHeader>
        </Card>
    )
}


type NavbarProps = {
    auth: boolean
}

function Navbar(props: NavbarProps) {
    return (
        <nav className="mx-auto flex h-16 max-w-6xl items-center px-6 justify-between">

            <Link to="/" className="font-bold text-xl tracking-tight text-primary">Macro<span className="text-green-500">Meals</span></Link>

            <div className="flex items-center justify-center gap-2">
                <Button asChild variant={"ghost"} size={"icon"}>
                    <a href="https://github.com/vinceflores/macromeals"> <Github /> </a>
                </Button>
                <ModeToggle />
                {
                    props.auth && <Button asChild >
                        <Link to={"/home"}> Dashboard </Link>
                    </Button>
                }
                {
                    !props.auth &&
                    < div >
                        <Button asChild >
                            <Link to={"/auth/login"} > Log in </Link>
                        </Button>
                        <Button asChild variant={"outline"}>
                            <Link to={"/auth/register"} > Sign up </Link>
                        </Button>
                    </div>
                }
            </div>
        </nav >
    )
}