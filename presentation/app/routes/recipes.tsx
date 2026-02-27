import { data, useActionData, useLoaderData, useNavigation } from "react-router"
import { useRef, useState } from "react"

import RecipesPage, { type ActionData, type IngredientRow } from "components/recipes-page"
import type { CreateRecipePayload, FoodSearchResult, RecipeListItem } from "~/lib/recipes-api"
import { createRecipe, listRecipes, searchFood } from "~/lib/recipes-api"

import type { Route } from "./+types/recipes"

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
  const ingredientCalories = form
    .getAll("ingredient_calories")
    .map((v) => String(v ?? "").trim())
  const ingredientProtein = form
    .getAll("ingredient_protein")
    .map((v) => String(v ?? "").trim())
  const ingredientCarbs = form
    .getAll("ingredient_carbs")
    .map((v) => String(v ?? "").trim())
  const ingredientFat = form
    .getAll("ingredient_fat")
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
    const rawCalories = ingredientCalories[i] ?? "0"
    const rawProtein = ingredientProtein[i] ?? "0"
    const rawCarbs = ingredientCarbs[i] ?? "0"
    const rawFat = ingredientFat[i] ?? "0"
    const quantity = Number(rawQty)
    const calories = Number(rawCalories)
    const protein = Number(rawProtein)
    const carbs = Number(rawCarbs)
    const fat = Number(rawFat)

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
      calories_per_100g: Number.isNaN(calories) ? 0 : calories,
      protein_per_100g: Number.isNaN(protein) ? 0 : protein,
      carbs_per_100g: Number.isNaN(carbs) ? 0 : carbs,
      fat_per_100g: Number.isNaN(fat) ? 0 : fat,
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

  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([
    {
      id: 1,
      name: "",
      quantity: "",
      unit: "g",
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    },
  ])
  const [nextRowId, setNextRowId] = useState(2)
  const [rowSuggestions, setRowSuggestions] = useState<Record<number, FoodSearchResult[]>>({})
  const [rowSearchLoading, setRowSearchLoading] = useState<Record<number, boolean>>({})
  // `window.setTimeout` returns a number in the browser; using
  // `ReturnType<typeof setTimeout>` can resolve to `NodeJS.Timeout` when the
  // Node lib is present which leads to "number is not assignable to Timeout"
  // errors.  Explicitly type the map as `number` (or use the window overload).
  const searchDebounceTimers = useRef<Record<number, number>>({})

  function addIngredientRow() {
    setIngredientRows((prev) => [
      ...prev,
      {
        id: nextRowId,
        name: "",
        quantity: "",
        unit: "g",
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      },
    ])
    setNextRowId((prev) => prev + 1)
  }

  function removeIngredientRow(rowId: number) {
    setIngredientRows((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((row) => row.id !== rowId)
    })
    setRowSuggestions((prev) => {
      const next = { ...prev }
      delete next[rowId]
      return next
    })
    setRowSearchLoading((prev) => {
      const next = { ...prev }
      delete next[rowId]
      return next
    })
    const timerId = searchDebounceTimers.current[rowId]
    if (timerId) {
      clearTimeout(timerId)
      delete searchDebounceTimers.current[rowId]
    }
  }

  function setRowValue(rowId: number, key: "name" | "quantity" | "unit", value: string) {
    setIngredientRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    )
  }

  function onIngredientNameChange(rowId: number, value: string) {
    setRowValue(rowId, "name", value)
    const query = value.trim()

    const timerId = searchDebounceTimers.current[rowId]
    if (timerId) {
      clearTimeout(timerId)
    }

    if (query.length < 2) {
      setRowSuggestions((prev) => ({ ...prev, [rowId]: [] }))
      setRowSearchLoading((prev) => ({ ...prev, [rowId]: false }))
      return
    }

    searchDebounceTimers.current[rowId] = window.setTimeout(async () => {
      setRowSearchLoading((prev) => ({ ...prev, [rowId]: true }))
      try {
        const response = await searchFood(query)
        setRowSuggestions((prev) => ({ ...prev, [rowId]: response.results.slice(0, 6) }))
      } catch {
        setRowSuggestions((prev) => ({ ...prev, [rowId]: [] }))
      } finally {
        setRowSearchLoading((prev) => ({ ...prev, [rowId]: false }))
      }
    }, 300)
  }

  function onSelectIngredientSuggestion(rowId: number, food: FoodSearchResult) {
    setIngredientRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              name: food.description ?? "",
              macros: {
                calories: food.macros.calories,
                protein: food.macros.protein,
                carbs: food.macros.carbs,
                fat: food.macros.fat,
              },
            }
          : row,
      ),
    )
    setRowSuggestions((prev) => ({ ...prev, [rowId]: [] }))
  }

  return (
    <RecipesPage
      recipes={recipes}
      loadError={loadError}
      actionData={actionData}
      isSubmitting={isSubmitting}
      ingredientRows={ingredientRows}
      rowSuggestions={rowSuggestions}
      rowSearchLoading={rowSearchLoading}
      onSetRowValue={setRowValue}
      onIngredientNameChange={onIngredientNameChange}
      onSelectIngredientSuggestion={onSelectIngredientSuggestion}
      onRemoveIngredientRow={removeIngredientRow}
      onAddIngredientRow={addIngredientRow}
    />
  )
}
