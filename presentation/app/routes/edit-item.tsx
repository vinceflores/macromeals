import type { Route } from "./+types/edit-item"
import { Link, data, redirect, useActionData, useLoaderData, useNavigation } from "react-router"
import { useRef, useState } from "react"

import RecipeFormBlock, { type RecipeFormIngredientRow } from "components/recipe-form-block"
import { Fetch } from "~/lib/auth.server"
import { searchFood, type FoodSearchResult } from "~/lib/recipes-api"
import { getSession } from "~/sessions.server"

type Profile = {
  email: string
  first_name: string
  last_name: string
}

type EditKind = "recipe" | "log"

type LoaderData = {
  profile: Profile
  kind: EditKind
  id: number
  error?: string
  name: string
  description: string
  servings: string
  ingredients: RecipeFormIngredientRow[]
}

type ActionData = {
  error?: string
}

const EMPTY_PROFILE: Profile = { email: "", first_name: "", last_name: "" }

function parseKind(value: string | undefined): EditKind | null {
  if (value === "recipe" || value === "log") return value
  return null
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"))
  if (!session.data.access) return redirect("/auth/login")

  const kind = parseKind(params.kind)
  const id = Number(params.id)
  if (!kind || !Number.isInteger(id) || id < 1) {
    return data<LoaderData>({
      profile: EMPTY_PROFILE,
      kind: "recipe",
      id: 0,
      error: "Invalid edit request.",
      name: "",
      description: "",
      servings: "1",
      ingredients: [],
    })
  }

  try {
    const profileRes = await Fetch(new Request(`${process.env.SERVER_URL}/api/accounts/profile/`), session)
    const profile = (await profileRes.json()) as Profile

    if (kind === "recipe") {
      const recipeRes = await Fetch(
        new Request(`${process.env.SERVER_URL}/recipe/${id}/`, {
          headers: { "Content-Type": "application/json" },
        }),
        session,
      )
      const recipe = (await recipeRes.json()) as {
        name: string
        description?: string
        servings?: number
        ingredients?: Array<{
          ingredient_name: string
          quantity: number
          unit: string
          calories_per_100g?: number
          protein_per_100g?: number
          carbs_per_100g?: number
          fat_per_100g?: number
        }>
      }

      return data<LoaderData>({
        profile,
        kind,
        id,
        name: recipe.name,
        description: recipe.description ?? "",
        servings: String(recipe.servings ?? 1),
        ingredients: (recipe.ingredients ?? []).map((ing, index) => ({
          id: index + 1,
          name: ing.ingredient_name,
          quantity: String(ing.quantity),
          unit: ing.unit || "g",
          macros: {
            calories: ing.calories_per_100g ?? 0,
            protein: ing.protein_per_100g ?? 0,
            carbs: ing.carbs_per_100g ?? 0,
            fat: ing.fat_per_100g ?? 0,
          },
        })),
      })
    }

    const logRes = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/logging/${id}/`, {
        headers: { "Content-Type": "application/json" },
      }),
      session,
    )
    const log = (await logRes.json()) as {
      meal_name: string
      description?: string
      servings?: number
      calories?: number
      protein?: number
      carbohydrates?: number
      fat?: number
      ingredients?: Array<{
        name: string
        quantity: number
        unit: string
        calories_per_100g?: number
        protein_per_100g?: number
        carbs_per_100g?: number
        fat_per_100g?: number
      }>
    }

    const ingredients = log.ingredients ?? []
    const totalQty = ingredients.reduce((sum, ing) => sum + Number(ing.quantity || 0), 0)
    const fallbackPer100 =
      totalQty > 0
        ? {
            calories: ((log.calories ?? 0) * 100) / totalQty,
            protein: ((log.protein ?? 0) * 100) / totalQty,
            carbs: ((log.carbohydrates ?? 0) * 100) / totalQty,
            fat: ((log.fat ?? 0) * 100) / totalQty,
          }
        : { calories: 0, protein: 0, carbs: 0, fat: 0 }

    return data<LoaderData>({
      profile,
      kind,
      id,
      name: log.meal_name,
      description: log.description ?? "",
      servings: String(log.servings ?? 1),
      ingredients: ingredients.map((ing, index) => ({
        id: index + 1,
        name: ing.name,
        quantity: String(ing.quantity),
        unit: ing.unit || "g",
        macros: {
          calories: ing.calories_per_100g ?? fallbackPer100.calories,
          protein: ing.protein_per_100g ?? fallbackPer100.protein,
          carbs: ing.carbs_per_100g ?? fallbackPer100.carbs,
          fat: ing.fat_per_100g ?? fallbackPer100.fat,
        },
      })),
    })
  } catch (error) {
    return data<LoaderData>({
      profile: EMPTY_PROFILE,
      kind,
      id,
      error: error instanceof Error ? error.message : "Failed to load item.",
      name: "",
      description: "",
      servings: "1",
      ingredients: [],
    })
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"))
  if (!session.data.access) return redirect("/auth/login")

  const kind = parseKind(params.kind)
  const id = Number(params.id)
  if (!kind || !Number.isInteger(id) || id < 1) {
    return data<ActionData>({ error: "Invalid edit request." }, { status: 400 })
  }

  const form = await request.formData()
  const name = String(form.get("name") ?? "").trim()
  const description = String(form.get("description") ?? "").trim()
  const servingsRaw = String(form.get("servings") ?? "1").trim()
  const servings = Number(servingsRaw)
  const ingredientNames = form.getAll("ingredient_name").map((v) => String(v ?? "").trim())
  const ingredientQuantities = form.getAll("ingredient_quantity").map((v) => String(v ?? "").trim())
  const ingredientUnits = form.getAll("ingredient_unit").map((v) => String(v ?? "").trim())
  const ingredientCalories = form.getAll("ingredient_calories").map((v) => String(v ?? "").trim())
  const ingredientProtein = form.getAll("ingredient_protein").map((v) => String(v ?? "").trim())
  const ingredientCarbs = form.getAll("ingredient_carbs").map((v) => String(v ?? "").trim())
  const ingredientFat = form.getAll("ingredient_fat").map((v) => String(v ?? "").trim())

  if (!name) return data<ActionData>({ error: "Name is required." }, { status: 400 })
  if (Number.isNaN(servings) || servings <= 0) {
    return data<ActionData>({ error: "Servings must be greater than 0." }, { status: 400 })
  }

  const ingredients: Array<{
    name: string
    quantity: number
    unit: string
    calories_per_100g: number
    protein_per_100g: number
    carbs_per_100g: number
    fat_per_100g: number
  }> = []

  for (let i = 0; i < ingredientNames.length; i += 1) {
    const ingName = ingredientNames[i] ?? ""
    if (!ingName) continue
    const quantity = Number(ingredientQuantities[i] ?? "")
    if (Number.isNaN(quantity) || quantity < 0) {
      return data<ActionData>({ error: `Ingredient row ${i + 1} has invalid quantity.` }, { status: 400 })
    }
    ingredients.push({
      name: ingName,
      quantity,
      unit: ingredientUnits[i] || "g",
      calories_per_100g: Number(ingredientCalories[i] ?? "0") || 0,
      protein_per_100g: Number(ingredientProtein[i] ?? "0") || 0,
      carbs_per_100g: Number(ingredientCarbs[i] ?? "0") || 0,
      fat_per_100g: Number(ingredientFat[i] ?? "0") || 0,
    })
  }

  if (!ingredients.length) {
    return data<ActionData>({ error: "Add at least one ingredient." }, { status: 400 })
  }

  try {
    if (kind === "recipe") {
      await Fetch(
        new Request(`${process.env.SERVER_URL}/recipe/${id}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            ingredients,
          }),
        }),
        session,
      )
      return redirect(`/recipes/${id}`)
    }

    await Fetch(
      new Request(`${process.env.SERVER_URL}/api/logging/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_name: name,
          description,
          servings,
          ingredients,
        }),
      }),
      session,
    )
    return redirect("/analytics/logging")
  } catch (error) {
    return data<ActionData>({ error: String(error) }, { status: 400 })
  }
}

export default function EditItemRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  const [name, setName] = useState(loaderData.name)
  const [description, setDescription] = useState(loaderData.description)
  const [servings, setServings] = useState(loaderData.servings)
  const [ingredientRows, setIngredientRows] = useState<RecipeFormIngredientRow[]>(
    loaderData.ingredients.length
      ? loaderData.ingredients
      : [
          {
            id: 1,
            name: "",
            quantity: "",
            unit: "g",
            macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          },
        ],
  )
  const [nextRowId, setNextRowId] = useState(2)
  const [rowSuggestions, setRowSuggestions] = useState<Record<number, FoodSearchResult[]>>({})
  const [rowSearchLoading, setRowSearchLoading] = useState<Record<number, boolean>>({})
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
    setIngredientRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== rowId)))
  }

  function setRowValue(rowId: number, key: "name" | "quantity" | "unit", value: string) {
    setIngredientRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)))
  }

  function onIngredientNameChange(rowId: number, value: string) {
    setRowValue(rowId, "name", value)
    const query = value.trim()
    const timerId = searchDebounceTimers.current[rowId]
    if (timerId) clearTimeout(timerId)
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

  const backTo = loaderData.kind === "recipe" ? `/recipes/${loaderData.id}` : "/analytics/logging"

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
        <Link to={backTo} className="text-sm underline">Back</Link>

        {loaderData.error ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold">Edit Item</h1>
            <p className="mt-2 text-sm text-red-700">{loaderData.error}</p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold">
              Edit {loaderData.kind === "recipe" ? "Recipe" : "Meal Log"}
            </h1>

            <div className="mt-4">
              {/* Shared recipe-style form keeps create and edit cohesive. */}
              <RecipeFormBlock
                name={name}
                description={description}
                servings={servings}
                servingsDisabled={loaderData.kind === "recipe"}
                submitLabel="Save Changes"
                isSubmitting={isSubmitting}
                rowSuggestions={rowSuggestions}
                rowSearchLoading={rowSearchLoading}
                ingredientRows={ingredientRows}
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onServingsChange={setServings}
                onSetRowValue={setRowValue}
                onIngredientNameChange={onIngredientNameChange}
                onSelectIngredientSuggestion={onSelectIngredientSuggestion}
                onRemoveIngredientRow={removeIngredientRow}
                onAddIngredientRow={addIngredientRow}
              />
            </div>

            {actionData?.error ? <p className="mt-3 text-sm text-red-700">{actionData.error}</p> : null}
          </>
        )}
    </div>
  )
}
