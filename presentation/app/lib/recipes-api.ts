const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"

type Macros = {
  total: {
    calories: number
    protein: number
    fat: number
    carbs: number
  }
  perServing: {
    calories: number
    protein: number
    fat: number
    carbs: number
  }
}

export type RecipeListItem = {
  id: number
  name: string
  servings: number
  created_at: string
  macros: Macros
}

export type RecipeIngredient = {
  ingredient_name: string
  quantity: number
  unit: string
}

export type RecipeDetail = {
  id: number
  name: string
  description: string
  servings: number
  created_at: string
  ingredients: RecipeIngredient[]
  macros: Macros
}

export type IngredientInput = {
  name: string
  quantity: number
  unit?: string
}

export type CreateRecipePayload = {
  name: string
  description?: string
  servings: number
  ingredients: IngredientInput[]
}

type ApiError = {
  detail?: string
  errors?: Record<string, unknown>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  })

  if (!res.ok) {
    let body: ApiError | null = null
    try {
      body = (await res.json()) as ApiError
    } catch {
      // no-op
    }
    const message = body?.detail ?? (body?.errors ? JSON.stringify(body.errors) : `HTTP ${res.status}`)
    throw new Error(message)
  }

  return (await res.json()) as T
}

export function listRecipes() {
  return request<RecipeListItem[]>("/recipe/")
}

export function getRecipe(recipeId: number) {
  return request<RecipeDetail>(`/recipe/${recipeId}/`)
}

export function createRecipe(payload: CreateRecipePayload) {
  return request<RecipeDetail>("/recipe/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
