import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { useRef, useState } from "react";

import AppHeader from "components/app-header";
import RecipeFormBlock, {
  type RecipeFormIngredientRow,
} from "components/recipe-form-block";
import type {
  CreateRecipePayload,
  FoodSearchResult,
  RecipeListItem,
} from "~/lib/recipes-api";
import { searchFood } from "~/lib/recipes-api";
import { Fetch } from "~/lib/auth.server";
import { getSession } from "~/sessions.server";

import type { Route } from "./+types/recipes";

type ActionData = {
  error?: string;
  success?: string;
};

export function meta(_: Route.MetaArgs) {
  return [
    { title: "MacroMeals Recipes" },
    {
      name: "description",
      content: "Create and browse recipes from the Django backend.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  try {
    const profileRes = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/accounts/profile/`),
      session,
    );
    const profile = await profileRes.json();

    const recipesRes = await Fetch(
      new Request(`${process.env.SERVER_URL}/recipe/`, {
        headers: { "Content-Type": "application/json" },
      }),
      session,
    );
    const recipes = (await recipesRes.json()) as RecipeListItem[];

    return data({ profile, recipes, loadError: undefined });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load recipes from backend.";

    return data(
      {
        profile: { email: "", first_name: "", last_name: "" },
        recipes: [] as RecipeListItem[],
        loadError: message,
      },
      { status: 200 },
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")

  if (intent === "delete_recipe") {
    const recipeId = Number(String(form.get("recipe_id") ?? "0"))
    if (!recipeId) {
      return data<ActionData>({ error: "Invalid recipe id." }, { status: 400 })
    }

    try {
      const res = await Fetch(
        new Request(`${process.env.SERVER_URL}/recipe/${recipeId}/`, {
          method: "DELETE",
        }),
        session,
      )

      if (!res.ok && res.status !== 204) {
        return data<ActionData>({ error: `Failed to remove recipe. HTTP ${res.status}` }, { status: 400 })
      }

      return data<ActionData>({ success: "Recipe removed." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove recipe."
      return data<ActionData>({ error: message }, { status: 400 })
    }
  }

  const name = String(form.get("name") ?? "").trim()
  const description = String(form.get("description") ?? "").trim()
  const servingsRaw = String(form.get("servings") ?? "1").trim()
  const ingredientNames = form.getAll("ingredient_name").map((v) => String(v ?? "").trim())
  const ingredientQuantities = form.getAll("ingredient_quantity").map((v) => String(v ?? "").trim())
  const ingredientUnits = form.getAll("ingredient_unit").map((v) => String(v ?? "").trim())
  const ingredientCalories = form.getAll("ingredient_calories").map((v) => String(v ?? "").trim())
  const ingredientProtein = form.getAll("ingredient_protein").map((v) => String(v ?? "").trim())
  const ingredientCarbs = form.getAll("ingredient_carbs").map((v) => String(v ?? "").trim())
  const ingredientFat = form.getAll("ingredient_fat").map((v) => String(v ?? "").trim())

  if (!name) {
    return data<ActionData>(
      { error: "Recipe name is required." },
      { status: 400 },
    );
  }

  const servings = Number(servingsRaw);
  if (!Number.isInteger(servings) || servings < 1) {
    return data<ActionData>(
      { error: "Servings must be a whole number greater than 0." },
      { status: 400 },
    );
  }

  if (!ingredientNames.length) {
    return data<ActionData>(
      { error: "Add at least one ingredient." },
      { status: 400 },
    );
  }

  const parsedIngredients: CreateRecipePayload["ingredients"] = [];
  for (let i = 0; i < ingredientNames.length; i += 1) {
    const rawName = ingredientNames[i] ?? "";
    const rawQty = ingredientQuantities[i] ?? "";
    const rawUnit = ingredientUnits[i] ?? "";
    const rawCalories = ingredientCalories[i] ?? "0";
    const rawProtein = ingredientProtein[i] ?? "0";
    const rawCarbs = ingredientCarbs[i] ?? "0";
    const rawFat = ingredientFat[i] ?? "0";

    const quantity = Number(rawQty);
    const calories = Number(rawCalories);
    const protein = Number(rawProtein);
    const carbs = Number(rawCarbs);
    const fat = Number(rawFat);

    if (!rawName || Number.isNaN(quantity) || quantity <= 0) {
      return data<ActionData>(
        { error: `Ingredient row ${i + 1} is invalid.` },
        { status: 400 },
      );
    }

    parsedIngredients.push({
      name: rawName,
      quantity,
      unit: rawUnit || "g",
      calories_per_100g: Number.isNaN(calories) ? 0 : calories,
      protein_per_100g: Number.isNaN(protein) ? 0 : protein,
      carbs_per_100g: Number.isNaN(carbs) ? 0 : carbs,
      fat_per_100g: Number.isNaN(fat) ? 0 : fat,
    });
  }

  try {
    const res = await Fetch(
      new Request(`${process.env.SERVER_URL}/recipe/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          servings,
          ingredients: parsedIngredients,
        } satisfies CreateRecipePayload),
      }),
      session,
    );

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        message = body?.detail ?? body?.errors ?? message;
      } catch {
        // keep default message
      }

      return data<ActionData>({ error: String(message) }, { status: 400 });
    }

    return data<ActionData>({ success: "Recipe created successfully." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create recipe.";
    return data<ActionData>({ error: message }, { status: 400 });
  }
}

export default function RecipesRoute() {
  const { profile, recipes, loadError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredientRows, setIngredientRows] = useState<
    RecipeFormIngredientRow[]
  >([
    {
      id: 1,
      name: "",
      quantity: "",
      unit: "g",
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    },
  ]);
  const [nextRowId, setNextRowId] = useState(2);
  const [rowSuggestions, setRowSuggestions] = useState<
    Record<number, FoodSearchResult[]>
  >({});
  const [rowSearchLoading, setRowSearchLoading] = useState<
    Record<number, boolean>
  >({});
  const searchDebounceTimers = useRef<Record<number, number>>({});

  const activeTab: "create" | "saved" =
    searchParams.get("tab") === "saved" ? "saved" : "create";

  function setActiveTab(tab: "create" | "saved") {
    const next = new URLSearchParams(searchParams);
    if (tab === "saved") next.set("tab", "saved");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  }

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
    ]);
    setNextRowId((prev) => prev + 1);
  }

  function removeIngredientRow(rowId: number) {
    setIngredientRows((prev) =>
      prev.length === 1 ? prev : prev.filter((row) => row.id !== rowId),
    );
  }

  function setRowValue(
    rowId: number,
    key: "name" | "quantity" | "unit",
    value: string,
  ) {
    setIngredientRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    );
  }

  function onIngredientNameChange(rowId: number, value: string) {
    setRowValue(rowId, "name", value);
    const query = value.trim();
    const timerId = searchDebounceTimers.current[rowId];
    if (timerId) clearTimeout(timerId);

    if (query.length < 2) {
      setRowSuggestions((prev) => ({ ...prev, [rowId]: [] }));
      setRowSearchLoading((prev) => ({ ...prev, [rowId]: false }));
      return;
    }

    searchDebounceTimers.current[rowId] = window.setTimeout(async () => {
      setRowSearchLoading((prev) => ({ ...prev, [rowId]: true }));
      try {
        const response = await searchFood(query);
        setRowSuggestions((prev) => ({
          ...prev,
          [rowId]: response.results.slice(0, 6),
        }));
      } catch {
        setRowSuggestions((prev) => ({ ...prev, [rowId]: [] }));
      } finally {
        setRowSearchLoading((prev) => ({ ...prev, [rowId]: false }));
      }
    }, 300);
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
    );
    setRowSuggestions((prev) => ({ ...prev, [rowId]: [] }));
  }

  function getTotalMacros(recipe: RecipeListItem) {
    const maybeAny = recipe as unknown as {
      macros?: {
        total?: {
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        };
        calories?: number;
        protein?: number;
        carbs?: number;
        carbohydrates?: number;
        fat?: number;
      };
    };

    const total = maybeAny.macros?.total;
    if (total) {
      return {
        calories: total.calories ?? 0,
        protein: total.protein ?? 0,
        carbs: total.carbs ?? 0,
        fat: total.fat ?? 0,
      };
    }

    return {
      calories: maybeAny.macros?.calories ?? 0,
      protein: maybeAny.macros?.protein ?? 0,
      carbs: maybeAny.macros?.carbs ?? maybeAny.macros?.carbohydrates ?? 0,
      fat: maybeAny.macros?.fat ?? 0,
    };
  }

  return (

    <div className="flex min-h-screen flex-col">
      {/*<AppHeader profile={profile} />*/}

      <main className="mx-auto w-full max-w-5xl p-6">
        <h1 className="text-3xl font-semibold">Recipes</h1>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`rounded border px-3 py-2 text-sm ${activeTab === "create" ? "bg-zinc-900 text-white" : ""}`}
          >
            Create Recipe
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`rounded border px-3 py-2 text-sm ${activeTab === "saved" ? "bg-zinc-900 text-white" : ""}`}
          >
            Saved Recipes
          </button>
        </div>

        {activeTab === "create" ? (
          <section className="mt-4 rounded border p-4">
            <h2 className="text-xl font-medium">Create Recipe</h2>
            <div className="mt-4">
              <RecipeFormBlock
                name={name}
                description={description}
                servings={servings}
                submitLabel="Create Recipe"
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

            {actionData?.error ? (
              <p className="mt-3 text-sm text-red-700">{actionData.error}</p>
            ) : null}

            {actionData?.success ? (
              <p className="mt-3 text-sm text-green-700">
                {actionData.success}
              </p>
            ) : null}
          </section>
        ) : (
          <section className="mt-4">
            <h2 className="text-xl font-medium">Saved Recipes</h2>

            {loadError ? (
              <p className="mt-3 text-sm text-red-700">{loadError}</p>
            ) : null}

            {!recipes.length ? (
              <p className="mt-3 text-sm text-zinc-600">No recipes yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {recipes.map((recipe) => {
                  const total = getTotalMacros(recipe);
                  return (
                    <li key={recipe.id} className="rounded border p-4">
                      <h3 className="font-semibold">{recipe.name}</h3>
                      <p className="text-sm text-zinc-600">
                        Servings: {recipe.servings}
                      </p>
                      <p className="mt-1 text-sm">
                        Total macros: {total.calories} kcal | P {total.protein}g
                        {" | "}C {total.carbs}g | F {total.fat}g
                      </p>
                      <div className="mt-2 flex gap-3">
                        <Link to={`/recipes/${recipe.id}`} className="inline-block text-sm underline">
                          View Details
                        </Link>
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete_recipe" />
                          <input type="hidden" name="recipe_id" value={recipe.id} />
                          <button type="submit" className="text-sm underline">
                            Remove
                          </button>
                        </Form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
