
import type { Route } from ".react-router/types/app/routes/recipe/+types/search-recipe";
import { useEffect } from "react";
import { data, Form, useActionData, useFetcher, useLoaderData, type FetcherWithComponents, type Session } from 'react-router';
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Fetch } from "~/lib/auth.server";
import { type CreateRecipePayload } from "~/lib/recipes-api";
import { getSession } from "~/sessions.server";


type Macros = {
    calories: number;
    carbohydrate: number;
    fat: number;
    protein: number;
};

type Recipe = {
    macros: Macros;
    name: string;
    description: string;
    id: string
};


export async function loader({ request }: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const page = url.searchParams.get("page")

    const res = await Fetch(
        new Request(`${process.env.SERVER_URL}/api/external/recipe/search?q=${q || "any"}&page=${page ? page : 0}`, {
            headers: {
                "Content-Type": "application/json"
            }
        }),
        session,
    )
    const recipes = await res.json()
    if (recipes.error) {
        return data({ recipes: [], error: recipes.error, page, q })
    }

    const r: Recipe[] = recipes.recipes
    return data({ recipes: r, error: undefined, page, q })
}

export async function action({ request }: Route.ActionArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    const payload = await request.json()
    // async function saveRecipeFromFS(payload: CreateRecipePayload, session: Session) {
        try {
            const res = await Fetch(
                new Request(`${process.env.SERVER_URL}/recipe/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }),
                session,
            )

            if (!res.ok) {
                let message = `HTTP ${res.status}`
                try {
                    const body = await res.json()
                    message = body?.detail ?? body?.errors ?? message
                } catch {
                    // Keep default message when response body is not JSON.
                }
                // return data<ActionData>({ error: String(message) }, { status: 400 })
                return data(
                    { success: false, error: true, message: String(message) }
                )
            }

            // return data<ActionData>({ success: "Recipe created successfully." },  )
            return data(
                { success: true, message: "Recipe created successfully." }
            )
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create recipe."
            return data({ success: false, error: true, message })
        }
    // }

    // return await saveRecipeFromFS(d, session)
}

export default function Recipes({
    loaderData
}: Route.ComponentProps) {
    // const  = useLoaderData<typeof loader>()
    const fetcher = useFetcher()
    const actionData = useActionData()

    useEffect(() => {
        if (!fetcher.data) return;
        if (fetcher.data.success) {
            toast.success(fetcher.data.message);
        } else {
            toast.error(fetcher.data.message);
        }
    }, [fetcher.data]);

    return loaderData.error ? (<div>
        Error
    </div>) : (
        <div className="w-full max-w-6xl m-auto py-6 flex flex-col justify-center items-center">
            <Form className="w-3/4 h-48 p-12  space-y-3" method="get" action="/recipes/search/external/">
                <Label htmlFor="search_recipe"> Search For Recipe </Label>
                <div className="flex items-center justify-center gap-2">
                    <Input name="q" id="search_recipe" placeholder="Chicken" />
                    <Input hidden defaultValue={0} name="page" type="number" />
                    <Button type="submit"> Search  </Button>
                </div>
            </Form>

            <div className="flex p-2 items-center justify-between w-full">
                <h2 className="font-light">{loaderData.recipes.length} resutls found</h2>
                <div className="flex justify-center  gap-1">
                    <Form >
                        <Input hidden value={Number(loaderData.page) - 1} name="page" type="number" />
                        <Input hidden name="q" defaultValue={loaderData.q as string} id="search_recipe" />
                        <Button disabled={Number(loaderData.page) === 0} type="submit" variant={"outline"}> Prev </Button>
                    </Form>
                    <Form>
                        <Input hidden value={Number(loaderData.page) + 1} name="page" type="number" />
                        <Input hidden name="q" defaultValue={loaderData.q as string} id="search_recipe" />
                        <Button type="submit" variant={"outline"}> Next </Button>
                    </Form>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
                {
                    loaderData.recipes.map(i => (
                        <RecipeCard key={i.id} recipe={i} fetcher={fetcher} />
                    ))
                }
            </div>
        </div>
    )
}

type RecipeCardProps = {
    fetcher: FetcherWithComponents<any>
    recipe: Recipe
}

function RecipeCard(props: RecipeCardProps) {
    const i = props.recipe
    const handleSave = () => props.fetcher.submit(
        {
            name: i.name,
            description: i.description,
            servings: 1,
            ingredients: [
                {
                    name: i.name,
                    quantity: 100,
                    calories_per_100g: i.macros.calories,
                    carbs_per_100g: i.macros.carbohydrate,
                    fat_per_100g: i.macros.fat,
                    protein_per_100g: i.macros.protein
                }
            ]
        } satisfies CreateRecipePayload,
        {
            method: "POST",
            preventScrollReset: true,
            encType: "application/json",
        }
    )
    return (
        <Card>
            <CardHeader>
                <CardTitle>{i.name} </CardTitle>
                <CardDescription> {i.description} </CardDescription>
            </CardHeader>
            <CardContent className="flex items-start w-md  justify-between gap-2">
                <div className=" h-full space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                        <p className="text-xs font-semibold">Calories: {i.macros.calories} </p>
                        <p>C: {i.macros.carbohydrate} </p>
                        <p>F: {i.macros.fat} </p>
                        <p>P: {i.macros.protein} </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <CardAction>
                    <Button onClick={handleSave} >Save</Button>
                </CardAction>
            </CardFooter>
        </Card>
    )
}