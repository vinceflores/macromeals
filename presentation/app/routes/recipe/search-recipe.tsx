
import type { Route } from ".react-router/types/app/routes/recipe/+types/search-recipe"
import { error } from "console";
import { data, useLoaderData } from "react-router"
import { Card, CardContent } from "~/components/ui/card";
import { Fetch } from "~/lib/auth.server"
import { getSession } from "~/sessions.server";


type Recipe = {
    recipe_description: string // "Tender artichoke quarters pair nicely with chicken and mushrooms in a creamy Alfredo sauce.",
    recipe_id: string // "60321",
    recipe_image: string //"https://m.ftscrt.com/static/recipe/bb15c3c8-d850-44b8-8985-c47f243c17fa.jpg",
    recipe_name: string// "Artichoke Chicken Alfredo",
    recipe_nutrition: {
        calories: string // "355",
        carbohydrate: string//"17.44",
        fat: string // "23.98",
        protein: string // "17.65"
    },
    recipe_url: string // "https://foods.fatsecret.com/recipes/artichoke-chicken-alfredo/Default.aspx"
}

export async function loader({ request }: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    const url = new URL(request.url);
    const q = url.searchParams.get("q");

    const res = await Fetch(
        new Request(`${process.env.SERVER_URL}/api/external/recipe/search?q=${q}`, {
            headers: {
                "Content-Type": "application/json"
            }
        }),
        session,
    )
    const recipes = await res.json()
    if (recipes.error) {
        return data({ recipes: [], error: recipes.error })
    }

    const r: Recipe[] = recipes.recipes
    return data({ recipes: r, error: undefined })
}

export default function Recipes() {
    const data = useLoaderData<typeof loader>()
    return data.error ? (<div>
        Error
    </div>) : (
        <div className="w-full m-auto flex flex-col justify-center items-center">
            <div className="grid grid-cols-3 gap-3">
                {
                    data.recipes.map(i => (
                        <Card key={i.recipe_id} className="">
                            <CardContent className="flex items-start w-md  justify-between gap-2">
                                {
                                    i.recipe_image ?
                                        <img src={i.recipe_image} className="h-24 w-24 " /> : 
                                        <div className="h-24 w-24 flex items-center justify-center bg-gray-300">
                                            <p className="capitalize text-4xl">{i.recipe_name[0]}</p>
                                        </div>
                                }
                                <div className=" h-full space-y-2">
                                    <h1 className="text-md font-bold">{i.recipe_name}</h1>
                                    <p className="text-xs font-semibold">Calories: {i.recipe_nutrition.calories} </p>
                                    <p className="text-sm">{i.recipe_description}</p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <p>Fat: {i.recipe_nutrition.fat} </p>
                                        <p>Protein: {i.recipe_nutrition.protein} </p>
                                        <p>Carbs: {i.recipe_nutrition.carbohydrate} </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                }
            </div>
        </div>
    )
}