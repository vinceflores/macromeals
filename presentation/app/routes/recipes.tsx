import { Form, Link, data, useActionData, useLoaderData, useNavigation } from "react-router"
import { useState } from "react"

import type { CreateRecipePayload, RecipeListItem } from "~/lib/recipes-api"
import { createRecipe, listRecipes } from "~/lib/recipes-api"

import type { Route } from "./+types/recipes"

type ActionData = {
  error?: string
  success?: string
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: "MacroMeals Recipes" },
    { name: "description", content: "Create and browse recipes from the Django backend." },
  ]
}

export async function loader() {
  try {
    const recipes = await listRecipes()
    return data({ recipes, loadError: undefined })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load recipes from backend."
    return data({ recipes: [] as RecipeListItem[], loadError: message }, { status: 200 })
  }
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData()
  const name = String(form.get("name") ?? "").trim()
  const description = String(form.get("description") ?? "").trim()
  const servingsRaw = String(form.get("servings") ?? "1").trim()
  const ingredientNames = form
    .getAll("ingredient_name")
    .map((v) => String(v ?? "").trim())
  const ingredientQuantities = form
    .getAll("ingredient_quantity")
    .map((v) => String(v ?? "").trim())
  const ingredientUnits = form
    .getAll("ingredient_unit")
    .map((v) => String(v ?? "").trim())

  if (!name) {
    return data<ActionData>({ error: "Recipe name is required." }, { status: 400 })
  }

  const servings = Number(servingsRaw)
  if (!Number.isInteger(servings) || servings < 1) {
    return data<ActionData>({ error: "Servings must be a whole number greater than 0." }, { status: 400 })
  }

  if (!ingredientNames.length) {
    return data<ActionData>(
      { error: "Add at least one ingredient." },
      { status: 400 },
    )
  }

  const parsedIngredients: CreateRecipePayload["ingredients"] = []

  for (let i = 0; i < ingredientNames.length; i += 1) {
    const rawName = ingredientNames[i] ?? ""
    const rawQty = ingredientQuantities[i] ?? ""
    const rawUnit = ingredientUnits[i] ?? ""
    const quantity = Number(rawQty)

    if (!rawName || Number.isNaN(quantity) || quantity <= 0) {
      return data<ActionData>(
        { error: `Ingredient row ${i + 1} is invalid. Fill ingredient, size, and unit.` },
        { status: 400 },
      )
    }

    parsedIngredients.push({
      name: rawName,
      quantity,
      unit: rawUnit || "g",
    })
  }

  try {
    await createRecipe({
      name,
      description,
      servings,
      ingredients: parsedIngredients,
    })
    return data<ActionData>({ success: "Recipe created successfully." })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create recipe."
    return data<ActionData>({ error: message }, { status: 400 })
  }
}

export default function RecipesRoute() {
  const { recipes, loadError } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"
  const [ingredientRows, setIngredientRows] = useState<number[]>([0])

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-semibold">Recipes</h1>
      <p className="mt-2 text-sm text-zinc-600">
        This page reads from and writes to your Django recipe endpoints.
      </p>

      <section className="mt-8 rounded border p-4">
        <h2 className="text-xl font-medium">Create Recipe</h2>
        <Form method="post" className="mt-4 space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Chicken and rice bowl"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="High-protein weekday meal"
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="servings" className="block text-sm font-medium">
              Servings
            </label>
            <input
              id="servings"
              name="servings"
              type="number"
              min={1}
              defaultValue={1}
              required
              className="mt-1 w-32 rounded border px-3 py-2"
            />
          </div>
          <div>
            <p className="block text-sm font-medium">Ingredients</p>
            <div className="mt-2 space-y-2">
              {ingredientRows.map((rowId, index) => (
                <div key={rowId} className="grid grid-cols-12 gap-2">
                  <input
                    name="ingredient_name"
                    required
                    className="col-span-6 rounded border px-3 py-2"
                    placeholder="Ingredient"
                  />
                  <input
                    name="ingredient_quantity"
                    type="number"
                    step="any"
                    min={0.01}
                    required
                    className="col-span-3 rounded border px-3 py-2"
                    placeholder="Size"
                  />
                  <input
                    name="ingredient_unit"
                    defaultValue="g"
                    required
                    className="col-span-2 rounded border px-3 py-2"
                    placeholder="Unit"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setIngredientRows((prev) => prev.filter((id) => id !== rowId))
                    }
                    disabled={ingredientRows.length === 1}
                    className="col-span-1 rounded border px-2 py-2 text-sm disabled:opacity-40"
                    aria-label={`Remove ingredient row ${index + 1}`}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setIngredientRows((prev) => [...prev, (prev[prev.length - 1] ?? 0) + 1])
              }
              className="mt-2 rounded border px-3 py-2 text-sm"
            >
              Add Ingredient
            </button>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : "Create Recipe"}
          </button>
        </Form>
        {actionData?.error && <p className="mt-3 text-sm text-red-700">{actionData.error}</p>}
        {actionData?.success && <p className="mt-3 text-sm text-green-700">{actionData.success}</p>}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Recipe List</h2>
        {loadError && <p className="mt-3 text-sm text-red-700">{loadError}</p>}
        {!recipes.length ? (
          <p className="mt-3 text-sm text-zinc-600">No recipes yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recipes.map((recipe) => (
              <li key={recipe.id} className="rounded border p-4">
                <h3 className="font-semibold">{recipe.name}</h3>
                <p className="text-sm text-zinc-600">Servings: {recipe.servings}</p>
                <p className="mt-1 text-sm">
                  Total macros: {recipe.macros.total.calories} kcal | P {recipe.macros.total.protein}g | C{" "}
                  {recipe.macros.total.carbs}g | F {recipe.macros.total.fat}g
                </p>
                <Link to={`/recipes/${recipe.id}`} className="mt-2 inline-block text-sm underline">
                  View Details
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
