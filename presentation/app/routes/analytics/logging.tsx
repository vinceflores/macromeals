import type { Route } from ".react-router/types/app/routes/analytics/+types/logging"
import AppHeader from "components/app-header"
import { data, Form, Link, redirect, useActionData, useLoaderData, useNavigation, useSearchParams } from "react-router"
import { useRef, useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Fetch } from "~/lib/auth.server"
import { searchFood, type FoodSearchResult, type RecipeListItem } from "~/lib/recipes-api"
import { getSession } from "~/sessions.server"
import { WaterLogForm } from "components/water-log-form"

type MealLogIngredient = {
  name: string
  quantity: number
  unit: string
}

type MealLog = {
  id: number
  meal_name: string
  description: string
  ingredients: MealLogIngredient[]
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  created_at: string
}

type Profile = {
  email: string
  first_name: string
  last_name: string
}

type ActionData = {
  success?: string
  error?: string
}

type RecipeMacroShape = {
  total?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  calories?: number
  protein?: number
  carbs?: number
  carbohydrates?: number
  fat?: number
}

async function getErrorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get("Content-Type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as { detail?: string; errors?: unknown }
      if (body.detail) return body.detail
      if (body.errors) return JSON.stringify(body.errors)
    } catch {
      // Fall back to status text when JSON parsing fails.
    }
  }
  return `${fallback} (HTTP ${response.status})`
}

function getRecipeMacros(recipe: { macros?: RecipeMacroShape }) {
  const total = recipe.macros?.total
  if (total) {
    return {
      calories: total.calories ?? 0,
      protein: total.protein ?? 0,
      carbohydrates: total.carbs ?? 0,
      fat: total.fat ?? 0,
    }
  }

  return {
    calories: recipe.macros?.calories ?? 0,
    protein: recipe.macros?.protein ?? 0,
    carbohydrates: recipe.macros?.carbs ?? recipe.macros?.carbohydrates ?? 0,
    fat: recipe.macros?.fat ?? 0,
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"))
  if (!session.data.access) return redirect("/auth/login")

  try {
    const [profileRes, recipesRes, logsRes] = await Promise.all([
      Fetch(new Request(`${process.env.SERVER_URL}/api/accounts/profile/`), session),
      Fetch(new Request(`${process.env.SERVER_URL}/recipe/`), session),
      Fetch(new Request(`${process.env.SERVER_URL}/api/logging/`), session),
    ])

    const profile = (await profileRes.json()) as Profile
    const recipes = (await recipesRes.json()) as RecipeListItem[]
    const logsBody = await logsRes.json()

    return data({
      profile,
      recipes,
      logs: (logsBody.results ?? []) as MealLog[],
      error: undefined,
    })
  } catch (error) {
    return data({
      profile: { email: "", first_name: "", last_name: "" } as Profile,
      recipes: [] as RecipeListItem[],
      logs: [] as MealLog[],
      error: String(error),
    })
  }
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"))
  if (!session.data.access) return redirect("/auth/login")

  const form = await request.formData()
  const intent = String(form.get("intent") ?? "simple")

  if (intent === "delete_log") {
    const logId = Number(String(form.get("log_id") ?? "0"))
    if (!logId) {
      return data<ActionData>({ error: "Invalid log id." }, { status: 400 })
    }

    try {
      const response = await Fetch(
        new Request(`${process.env.SERVER_URL}/api/logging/${logId}/`, {
          method: "DELETE",
        }),
        session,
      )
      if (!response.ok && response.status !== 204) {
        const message = await getErrorMessage(response, "Failed to remove log")
        return data<ActionData>({ error: message }, { status: 400 })
      }
      return data<ActionData>({ success: "Log removed." })
    } catch (error) {
      return data<ActionData>({ error: String(error) }, { status: 400 })
    }
  }

  let payload: {
    meal_name: string
    description: string
    servings: number
    ingredients: Array<{
      name: string
      quantity: number
      unit: string
      calories_per_100g: number
      protein_per_100g: number
      carbs_per_100g: number
      fat_per_100g: number
    }>
  }

  if (intent === "recipe") {
    const recipeId = Number(String(form.get("recipe_id") ?? "0"))
    const servingsToLog = Number(String(form.get("servings_to_log") ?? "1"))
    if (!recipeId) {
      return data<ActionData>({ error: "Select a recipe first." }, { status: 400 })
    }
    if (Number.isNaN(servingsToLog) || servingsToLog <= 0) {
      return data<ActionData>({ error: "Servings to log must be greater than 0." }, { status: 400 })
    }

    try {
      const recipeRes = await Fetch(
        new Request(`${process.env.SERVER_URL}/recipe/${recipeId}/`, {
          headers: { "Content-Type": "application/json" },
        }),
        session,
      )
      if (!recipeRes.ok) {
        const message = await getErrorMessage(recipeRes, "Failed to load recipe")
        return data<ActionData>({ error: message }, { status: 400 })
      }
      const recipe = (await recipeRes.json()) as {
        servings?: number
        name: string
        description?: string
        ingredients?: Array<{
          ingredient_name: string
          quantity: number
          unit: string
          calories_per_100g?: number
          protein_per_100g?: number
          carbs_per_100g?: number
          fat_per_100g?: number
        }>
        macros?: RecipeMacroShape
      }
      const recipeServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1
      const factor = servingsToLog / recipeServings

      payload = {
        meal_name: recipe.name,
        description: recipe.description ?? "",
        servings: servingsToLog,
        ingredients: (recipe.ingredients ?? []).map((ing) => ({
          name: ing.ingredient_name,
          quantity: Number((ing.quantity * factor).toFixed(2)),
          unit: ing.unit || "g",
          calories_per_100g: ing.calories_per_100g ?? 0,
          protein_per_100g: ing.protein_per_100g ?? 0,
          carbs_per_100g: ing.carbs_per_100g ?? 0,
          fat_per_100g: ing.fat_per_100g ?? 0,
        })),
      }
    } catch (error) {
      return data<ActionData>({ error: String(error) }, { status: 400 })
    }
  } else if (intent === "simple") {
    const itemName = String(form.get("meal_name") ?? "").trim()
    const quantity = Number(String(form.get("quantity") ?? "0"))
    const unit = String(form.get("unit") ?? "g").trim() || "g"
    const fdcId = Number(String(form.get("fdc_id") ?? "0"))
    const per100Calories = Number(String(form.get("calories_per_100g") ?? "0"))
    const per100Protein = Number(String(form.get("protein_per_100g") ?? "0"))
    const per100Carbs = Number(String(form.get("carbs_per_100g") ?? "0"))
    const per100Fat = Number(String(form.get("fat_per_100g") ?? "0"))

    if (!itemName) {
      return data<ActionData>({ error: "Select a food first." }, { status: 400 })
    }
    if (!fdcId) {
      return data<ActionData>({ error: "Pick one USDA food from the list." }, { status: 400 })
    }
    if (Number.isNaN(quantity) || quantity <= 0) {
      return data<ActionData>({ error: "Size must be greater than 0." }, { status: 400 })
    }

    payload = {
      meal_name: itemName,
      description: "",
      servings: 1,
      ingredients: [
        {
          name: itemName,
          quantity,
          unit,
          calories_per_100g: Number.isNaN(per100Calories) ? 0 : per100Calories,
          protein_per_100g: Number.isNaN(per100Protein) ? 0 : per100Protein,
          carbs_per_100g: Number.isNaN(per100Carbs) ? 0 : per100Carbs,
          fat_per_100g: Number.isNaN(per100Fat) ? 0 : per100Fat,
        },
      ],
    }
  } else {
    return data<ActionData>({ error: "Unknown action intent." }, { status: 400 })
  }

  try {
    const response = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/logging/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      session,
    )

    if (!response.ok) {
      const message = await getErrorMessage(response, "Failed to save meal log")
      return data<ActionData>({ error: message }, { status: 400 })
    }

    return data<ActionData>({ success: "Meal logged." })
  } catch (error) {
    return data<ActionData>({ error: String(error) }, { status: 400 })
  }
}

export default function MealLoggingPage() {
  const { profile, recipes, logs, error } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mealName, setMealName] = useState("")
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [suggestions, setSuggestions] = useState<FoodSearchResult[]>([])
  const [recipeQuery, setRecipeQuery] = useState("")
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimer = useRef<number | undefined>(undefined)
  const isSubmitting = navigation.state === "submitting"
  const mode = searchParams.get("mode") === "recipe" ? "recipe" : "simple"

  function setMode(nextMode: "recipe" | "simple") {
    const next = new URLSearchParams(searchParams)
    next.set("mode", nextMode)
    setSearchParams(next, { replace: true })
  }

  function getRecipeCalories(recipe: RecipeListItem) {
    const macros = getRecipeMacros(recipe as unknown as { macros?: RecipeMacroShape })
    const total = macros.calories
    const perServing = recipe.servings > 0 ? total / recipe.servings : total
    return { total, perServing: Number(perServing.toFixed(2)) }
  }

  function onSimpleMealNameChange(value: string) {
    setMealName(value)
    setSelectedFood(null)
    const query = value.trim()

    if (searchTimer.current) {
      clearTimeout(searchTimer.current)
    }

    if (query.length < 2) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    searchTimer.current = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await searchFood(query)
        setSuggestions(response.results.slice(0, 6))
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  function onSelectSimpleFood(food: FoodSearchResult) {
    setMealName(food.description ?? "")
    setSelectedFood(food)
    setSuggestions([])
  }

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(recipeQuery.trim().toLowerCase()),
  )

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader profile={profile} />

      <main className="mx-auto w-full max-w-5xl p-6 space-y-4">
        <h1 className="text-3xl font-semibold">Meal Logging</h1>

        <Card>
          <CardHeader>
            <CardTitle>How do you want to log?</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button type="button" variant={mode === "recipe" ? "default" : "outline"} onClick={() => setMode("recipe")}>
              Log Saved Recipe
            </Button>
            <Button type="button" variant={mode === "simple" ? "default" : "outline"} onClick={() => setMode("simple")}>
              Log An Item
            </Button>
          </CardContent>
        </Card>

        {mode === "recipe" ? (
          <Card>
            <CardHeader>
              <CardTitle>Log Saved Recipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!recipes.length ? (
                <p className="text-sm text-muted-foreground">
                  No saved recipes yet. <Link to="/recipes" className="underline">Create a recipe first</Link>.
                </p>
              ) : (
                <Form method="post" className="space-y-3">
                  <input type="hidden" name="intent" value="recipe" />
                  <input type="hidden" name="recipe_id" value={selectedRecipeId ?? ""} />
                  <div>
                    <Label htmlFor="recipe_search" className="py-1">Recipe</Label>
                    <Input
                      id="recipe_search"
                      placeholder="Type to search recipes..."
                      value={recipeQuery}
                      onChange={(event) => {
                        setRecipeQuery(event.target.value)
                        setSelectedRecipeId(null)
                      }}
                      autoComplete="off"
                    />
                  </div>
                  <div className="max-h-48 overflow-auto rounded border p-1">
                    {!filteredRecipes.length ? (
                      <p className="px-2 py-1 text-sm text-muted-foreground">No recipes found.</p>
                    ) : (
                      filteredRecipes.map((recipe) => {
                        const calories = getRecipeCalories(recipe)
                        const isSelected = selectedRecipeId === recipe.id
                        return (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => {
                              setSelectedRecipeId(recipe.id)
                              setRecipeQuery(recipe.name)
                            }}
                            className={`w-full rounded px-2 py-2 text-left text-sm hover:bg-accent ${isSelected ? "bg-accent" : ""}`}
                          >
                            <p className="font-medium">{recipe.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {calories.perServing} kcal per 1 serving
                            </p>
                          </button>
                        )
                      })
                    )}
                  </div>
                  {selectedRecipeId ? null : <p className="text-xs text-muted-foreground">Select one recipe from the list.</p>}
                  <div>
                    <Label htmlFor="servings_to_log">Servings</Label>
                    <Input id="servings_to_log" name="servings_to_log" type="number" min="0.1" step="0.1" defaultValue="1" className="mt-1 w-32 rounded border px-3 py-2" required />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting || !selectedRecipeId}>
                      {isSubmitting ? "Saving..." : "Log Recipe"}
                    </Button>
                    <Link to="/recipes" className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent">
                      Go to Recipes
                    </Link>
                  </div>
                </Form>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Log An Item</CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-3">
                <input type="hidden" name="intent" value="simple" />
                <div className="relative">
                  <Label htmlFor="meal_name">Item Name</Label>
                  <Input
                    id="meal_name"
                    name="meal_name"
                    placeholder="Search food (example: chicken breast)"
                    required
                    value={mealName}
                    onChange={(event) => onSimpleMealNameChange(event.target.value)}
                    autoComplete="off"
                  />
                  {isSearching ? <p className="mt-1 text-xs text-muted-foreground">Searching USDA...</p> : null}
                  {!!suggestions.length ? (
                    <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border bg-white p-1 shadow">
                      {suggestions.map((food) => (
                        <li key={food.fdcId}>
                          <button
                            type="button"
                            onClick={() => onSelectSimpleFood(food)}
                            className="w-full rounded px-2 py-1 text-left hover:bg-zinc-100"
                          >
                            <p className="text-sm">{food.description}</p>
                            {food.brandOwner ? <p className="text-xs text-zinc-500">Brand: {food.brandOwner}</p> : null}
                            <p className="text-xs text-zinc-600">
                              {food.macros.calories} kcal | P {food.macros.protein}g | C {food.macros.carbs}g | F {food.macros.fat}g (per 100g)
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="quantity">Size</Label>
                    <Input id="quantity" name="quantity" type="number" min="0.01" step="0.01" defaultValue="100" required />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input id="unit" name="unit" defaultValue="g" required />
                  </div>
                </div>

                <input type="hidden" name="fdc_id" value={selectedFood?.fdcId ?? ""} />
                <input type="hidden" name="calories_per_100g" value={selectedFood?.macros.calories ?? 0} />
                <input type="hidden" name="protein_per_100g" value={selectedFood?.macros.protein ?? 0} />
                <input type="hidden" name="carbs_per_100g" value={selectedFood?.macros.carbs ?? 0} />
                <input type="hidden" name="fat_per_100g" value={selectedFood?.macros.fat ?? 0} />

                <Button type="submit" disabled={isSubmitting || !selectedFood}>
                  {isSubmitting ? "Saving..." : "Log 1 Item"}
                </Button>
              </Form>
            </CardContent>
          </Card>
        )}

        {actionData?.error ? <p className="text-sm text-red-600">{actionData.error}</p> : null}
        {actionData?.success ? <p className="text-sm text-green-600">{actionData.success}</p> : null}

        <WaterLogForm />

        <Card>
          <CardHeader>
            <CardTitle>Saved Meal Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meals logged yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border rounded p-3">
                  <p className="font-medium">{log.meal_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {log.calories} kcal | P {log.protein}g | C {log.carbohydrates}g | F {log.fat}g
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Link to={`/edit/log/${log.id}`} className="rounded border px-3 py-1 text-sm hover:bg-accent">
                      Edit
                    </Link>
                    {/* Delete is scoped to this single log only. */}
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete_log" />
                      <input type="hidden" name="log_id" value={log.id} />
                      <Button type="submit" variant="outline">Remove</Button>
                    </Form>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
