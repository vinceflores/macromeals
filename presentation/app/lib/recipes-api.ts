
function getApiBaseUrl() {
  if (import.meta.env.SSR) {
    return (
      process.env.API_BASE_URL ??
      process.env.SERVER_URL ??
      "http://backend:8000" 
    )
  }

  return (
    import.meta.env.VITE_API_BASE_URL
  )
}

const API_BASE_URL = getApiBaseUrl().replace(/\/+$/, "")

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
  recipe_image?: string
  macros: Macros
}

export type IngredientInput = {
  name: string
  quantity: number
  unit?: string
  calories_per_100g?: number
  protein_per_100g?: number
  carbs_per_100g?: number
  fat_per_100g?: number
}

export type FoodSearchResult = {
  fdcId: number
  description: string
  brandOwner?: string | null
  dataType?: string | null
  macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

export type CreateRecipePayload = {
  name: string
  description?: string
  servings: number
  ingredients: IngredientInput[]
  recipe_image?: string
}

type ApiError = {
  detail?: string
  errors?: Record<string, unknown>
}

type FoodSearchResponse = {
  results: FoodSearchResult[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
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

// umused
export function listRecipes() {
  return request<RecipeListItem[]>("/recipe/")
}

// umused
export function getRecipe(recipeId: number) {
  return request<RecipeDetail>(`/recipe/${recipeId}/`)
}

// umused
export function createRecipe(payload: CreateRecipePayload) {
  return request<RecipeDetail>("/recipe/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function searchFood(query: string) {
  const q = encodeURIComponent(query.trim())
  return request<FoodSearchResponse>(`/food/search/?q=${q}`)
}

// export async function searchFoodExternal(q: string, page: number, session:Session) {

//     const res = await Fetch(
//         new Request(`${process.env.SERVER_URL}/api/external/recipe/search?q=${q || "any"}&page=${page}`, {
//             headers: {
//                 "Content-Type": "application/json"
//             }
//         }),
//         session,
//     )

//     if(!res.ok){
//       return []
//     }
//     return  await res.json()
// }

