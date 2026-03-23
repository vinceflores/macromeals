import { Form, Link, data, redirect, useActionData, useLoaderData, useNavigation } from "react-router"

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

type ActionData = {
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

export async function action({ request, params }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"))
  if (!session.data.access) return redirect("/auth/login")

  const id = Number(params.id)
  if (!Number.isInteger(id) || id < 1) {
    return data<ActionData>({ error: "Invalid recipe ID." }, { status: 400 })
  }

  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")
  if (intent !== "delete_recipe") {
    return data<ActionData>({ error: "Unknown action." }, { status: 400 })
  }

  try {
    const response = await Fetch(
      new Request(`${process.env.SERVER_URL}/recipe/${id}/`, {
        method: "DELETE",
      }),
      session,
    )

    if (!response.ok && response.status !== 204) {
      return data<ActionData>({ error: `Failed to remove recipe. HTTP ${response.status}` }, { status: 400 })
    }

    return redirect("/recipes?tab=saved")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove recipe."
    return data<ActionData>({ error: message }, { status: 400 })
  }
}

export default function RecipeDetailRoute() {
  const { profile, recipe, error } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const macros = recipe ? normalizeMacros(recipe) : null
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
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
          {
            recipe.recipe_image &&
            <img src={recipe.recipe_image} alt={recipe.name} className="w-full h-64 my-2 aspect-video object-cover" />
          }
          <div className="mt-4 flex items-center justify-between">

            <h1 className="text-3xl font-semibold">{recipe.name}</h1>
            <div className="flex gap-2">
              <Link to={`/edit/recipe/${recipe.id}`} className="rounded border px-3 py-2 text-sm hover:bg-accent">
                Edit
              </Link>
              <Form method="post">
                <input type="hidden" name="intent" value="delete_recipe" />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
                >
                  {isSubmitting ? "Removing..." : "Remove"}
                </button>
              </Form>
            </div>
          </div>
          <p className="mt-2 text-sm text-zinc-600">Servings: {recipe.servings}</p>

          {recipe.description ? <p className="mt-3">{recipe.description}</p> : null}
          {actionData?.error ? <p className="mt-3 text-sm text-red-700">{actionData.error}</p> : null}

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
    </div>
  )
}
