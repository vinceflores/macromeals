import { Link, data, useLoaderData } from "react-router"

import { getRecipe } from "~/lib/recipes-api"

import type { Route } from "./+types/recipe-detail"

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Recipe Details" },
    { name: "description", content: "View one recipe and its macro breakdown." },
  ]
}

export async function loader({ params }: Route.LoaderArgs) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id < 1) {
    return data({ recipe: null, error: "Invalid recipe ID." }, { status: 400 })
  }

  try {
    const recipe = await getRecipe(id)
    return data({ recipe, error: undefined })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recipe."
    return data({ recipe: null, error: message }, { status: 404 })
  }
}

export default function RecipeDetailRoute() {
  const { recipe, error } = useLoaderData<typeof loader>()

  if (error || !recipe) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link to="/recipes" className="text-sm underline">
          Back to Recipes
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Recipe not available</h1>
        <p className="mt-2 text-sm text-red-700">{error ?? "Unknown error."}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link to="/recipes" className="text-sm underline">
        Back to Recipes
      </Link>

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
          Total: {recipe.macros.total.calories} kcal | P {recipe.macros.total.protein}g | C{" "}
          {recipe.macros.total.carbs}g | F {recipe.macros.total.fat}g
        </p>
        <p className="mt-1 text-sm">
          Per serving: {recipe.macros.perServing.calories} kcal | P {recipe.macros.perServing.protein}g | C{" "}
          {recipe.macros.perServing.carbs}g | F {recipe.macros.perServing.fat}g
        </p>
      </section>
    </main>
  )
}
