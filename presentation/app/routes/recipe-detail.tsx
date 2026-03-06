import { Link, data, redirect, useLoaderData } from "react-router"

import AppHeader from "../../components/app-header"
import { Fetch } from "~/lib/auth.server"
import type { RecipeDetail } from "~/lib/recipes-api"
import { getSession } from "~/sessions.server"

import type { Route } from "./+types/recipe-detail"

type Profile = {
  email: string
  first_name: string
  last_name: string
}

type LoaderData = {
  profile: Profile
  recipe: RecipeDetail | null
  error?: string
}

const EMPTY_PROFILE: Profile = { email: "", first_name: "", last_name: "" }

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Recipe Details" },
    { name: "description", content: "View one recipe and its macro breakdown." },
  ]
}

function normalizeMacros(recipe: RecipeDetail) {
  // Support old and new backend macro payloads.
  const flat = recipe.macros as unknown as {
    calories?: number
    protein?: number
    carbs?: number
    carbohydrates?: number
    fat?: number
  }

  const total = recipe.macros?.total ?? {
    calories: flat.calories ?? 0,
    protein: flat.protein ?? 0,
    carbs: flat.carbs ?? flat.carbohydrates ?? 0,
    fat: flat.fat ?? 0,
  }

  // Always derive per-serving from total and recipe servings.
  const servings = Math.max(Number(recipe.servings) || 1, 1)
  const perServing = {
    calories: Math.round((total.calories / servings) * 100) / 100,
    protein: Math.round((total.protein / servings) * 100) / 100,
    carbs: Math.round((total.carbs / servings) * 100) / 100,
    fat: Math.round((total.fat / servings) * 100) / 100,
  }

  return { total, perServing }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"))
  if (!session.data.access) return redirect("/auth/login")

  const id = Number(params.id)
  if (!Number.isInteger(id) || id < 1) {
    return data<LoaderData>(
      { profile: EMPTY_PROFILE, recipe: null, error: "Invalid recipe ID." },
      { status: 400 },
    )
  }

  try {
    // Protected endpoints must be called through Fetch so JWT is attached.
    const profileRes = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/accounts/profile/`),
      session,
    )
    const profile = (await profileRes.json()) as Profile

    const recipeRes = await Fetch(
      new Request(`${process.env.SERVER_URL}/recipe/${id}/`, {
        headers: { "Content-Type": "application/json" },
      }),
      session,
    )
    const recipe = (await recipeRes.json()) as RecipeDetail

    return data<LoaderData>({ profile, recipe })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recipe."
    return data<LoaderData>(
      { profile: EMPTY_PROFILE, recipe: null, error: message },
      { status: 404 },
    )
  }
}

export default function RecipeDetailRoute() {
  const { profile, recipe, error } = useLoaderData<typeof loader>()
  const macros = recipe ? normalizeMacros(recipe) : null

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-3xl p-6">
        <Link to="/recipes?tab=saved" className="text-sm underline">
          Back to Recipes
        </Link>

        {!recipe || error || !macros ? (
          <>
            <h1 className="mt-4 text-2xl font-semibold">Recipe not available</h1>
            <p className="mt-2 text-sm text-red-700">{error ?? "Unknown error."}</p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold">{recipe.name}</h1>
            <p className="mt-2 text-sm text-zinc-600">Servings: {recipe.servings}</p>
            {recipe.description ? <p className="mt-3">{recipe.description}</p> : null}

            <section className="mt-6 rounded border p-4">
              <h2 className="text-xl font-medium">Ingredients</h2>
              <ul className="mt-3 space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={`${ingredient.ingredient_name}-${index}`} className="text-sm">
                    {ingredient.ingredient_name}: {ingredient.quantity} {ingredient.unit}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6 rounded border p-4">
              <h2 className="text-xl font-medium">Macros</h2>
              <p className="mt-2 text-sm">
                Total: {macros.total.calories} kcal | P {macros.total.protein}g | C{" "}
                {macros.total.carbs}g | F {macros.total.fat}g
              </p>
              <p className="mt-1 text-sm">
                Per serving: {macros.perServing.calories} kcal | P {macros.perServing.protein}g | C{" "}
                {macros.perServing.carbs}g | F {macros.perServing.fat}g
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
