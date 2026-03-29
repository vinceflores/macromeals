/**
 * presentation/app/routes/recipes.tsx
 * Tabs: My Recipes | Create | Browse Community
 * Visibility: private → friends_only → public (cycles on click)
 */

import {
  Link, data, redirect,
  useActionData, useFetcher, useLoaderData,
  useNavigation, useSearchParams,
} from "react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import RecipeFormBlock, { type RecipeFormIngredientRow } from "components/recipe-form-block";
import type { CreateRecipePayload, FoodSearchResult, RecipeListItem } from "~/lib/recipes-api";
import { searchFood } from "~/lib/recipes-api";
import { Fetch } from "~/lib/auth.server";
import { getSession } from "~/sessions.server";
import { Button } from "~/components/ui/button";
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle, CardAction,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";

import type { Route } from "./+types/recipes";

type ActionData = { error?: string; success?: string };

// ── Visibility helpers ────────────────────────────────────────────────────────

const VISIBILITY_LABELS: Record<string, string> = {
  private:      "🔒 Private",
  friends_only: "👥 Friends",
  public:       "🌐 Public",
};

const VISIBILITY_CLASSES: Record<string, string> = {
  private:      "border-zinc-300 bg-zinc-50 text-zinc-500 hover:bg-zinc-100",
  friends_only: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
  public:       "border-green-400 bg-green-50 text-green-700 hover:bg-green-100",
};

export function meta(_: Route.MetaArgs) {
  return [{ title: "MacroMeals Recipes" }];
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  try {
    const [profileRes, recipesRes, communityRes] = await Promise.all([
      Fetch(new Request(`${process.env.SERVER_URL}/api/accounts/profile/`), session),
      Fetch(new Request(`${process.env.SERVER_URL}/recipe/`, { headers: { "Content-Type": "application/json" } }), session),
      Fetch(new Request(`${process.env.SERVER_URL}/recipe/community/`, { headers: { "Content-Type": "application/json" } }), session),
    ]);

    const profile   = await profileRes.json();
    const recipes   = await recipesRes.json() as RecipeListItem[];
    const community = communityRes.ok ? await communityRes.json() : [];

    return data({ profile, recipes, community, loadError: undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load.";
    return data({ profile: { email: "", first_name: "", last_name: "" }, recipes: [] as RecipeListItem[], community: [], loadError: message });
  }
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  const form   = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "delete_recipe") {
    const recipeId = Number(String(form.get("recipe_id") ?? "0"));
    if (!recipeId) return data<ActionData>({ error: "Invalid recipe id." }, { status: 400 });
    try {
      const res = await Fetch(new Request(`${process.env.SERVER_URL}/recipe/${recipeId}/`, { method: "DELETE" }), session);
      if (!res.ok && res.status !== 204) return data<ActionData>({ error: `HTTP ${res.status}` }, { status: 400 });
      return data<ActionData>({ success: "Recipe removed." });
    } catch (e) {
      return data<ActionData>({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
    }
  }

  if (intent === "toggle_visibility") {
    const recipeId = Number(String(form.get("recipe_id") ?? "0"));
    if (!recipeId) return data<ActionData>({ error: "Invalid recipe id." }, { status: 400 });
    try {
      const res = await Fetch(new Request(`${process.env.SERVER_URL}/recipe/${recipeId}/visibility/`, { method: "PATCH" }), session);
      if (!res.ok) return data<ActionData>({ error: `HTTP ${res.status}` }, { status: 400 });
      const updated = await res.json();
      return data<ActionData>({ success: `Recipe is now ${updated.visibility}.` });
    } catch (e) {
      return data<ActionData>({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
    }
  }

  if (intent === "save_community_recipe") {
    const recipeId = Number(String(form.get("recipe_id") ?? "0"));
    if (!recipeId) return data<ActionData>({ error: "Invalid recipe id." }, { status: 400 });
    try {
      const res = await Fetch(new Request(`${process.env.SERVER_URL}/recipe/${recipeId}/save/`, { method: "POST", headers: { "Content-Type": "application/json" } }), session);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return data<ActionData>({ error: body?.detail ?? `HTTP ${res.status}` }, { status: 400 });
      }
      return data<ActionData>({ success: "Recipe saved to your library!" });
    } catch (e) {
      return data<ActionData>({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
    }
  }

  // Create recipe
  const name          = String(form.get("name") ?? "").trim();
  const description   = String(form.get("description") ?? "").trim();
  const servingsRaw   = String(form.get("servings") ?? "1").trim();
  const ingNames      = form.getAll("ingredient_name").map((v) => String(v).trim());
  const ingQtys       = form.getAll("ingredient_quantity").map((v) => String(v).trim());
  const ingUnits      = form.getAll("ingredient_unit").map((v) => String(v).trim());
  const ingCalories   = form.getAll("ingredient_calories").map((v) => String(v).trim());
  const ingProtein    = form.getAll("ingredient_protein").map((v) => String(v).trim());
  const ingCarbs      = form.getAll("ingredient_carbs").map((v) => String(v).trim());
  const ingFat        = form.getAll("ingredient_fat").map((v) => String(v).trim());

  if (!name) return data<ActionData>({ error: "Recipe name is required." }, { status: 400 });
  const servings = Number(servingsRaw);
  if (!Number.isInteger(servings) || servings < 1)
    return data<ActionData>({ error: "Servings must be a whole number > 0." }, { status: 400 });
  if (!ingNames.length) return data<ActionData>({ error: "Add at least one ingredient." }, { status: 400 });

  const parsedIngredients: CreateRecipePayload["ingredients"] = [];
  for (let i = 0; i < ingNames.length; i++) {
    const qty = Number(ingQtys[i] ?? "");
    if (!ingNames[i] || Number.isNaN(qty) || qty <= 0)
      return data<ActionData>({ error: `Ingredient row ${i + 1} is invalid.` }, { status: 400 });
    parsedIngredients.push({
      name: ingNames[i]!,
      quantity: qty,
      unit: ingUnits[i] || "g",
      calories_per_100g: Number(ingCalories[i] ?? "0") || 0,
      protein_per_100g:  Number(ingProtein[i]  ?? "0") || 0,
      carbs_per_100g:    Number(ingCarbs[i]    ?? "0") || 0,
      fat_per_100g:      Number(ingFat[i]      ?? "0") || 0,
    });
  }

  try {
    const res = await Fetch(
      new Request(`${process.env.SERVER_URL}/recipe/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, servings, ingredients: parsedIngredients } satisfies CreateRecipePayload),
      }),
      session,
    );
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try { const body = await res.json(); message = body?.detail ?? body?.errors ?? message; } catch {}
      return data<ActionData>({ error: String(message) }, { status: 400 });
    }
    return data<ActionData>({ success: "Recipe created successfully." });
  } catch (e) {
    return data<ActionData>({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecipesRoute() {
  const { profile, recipes, community, loadError } = useLoaderData<typeof loader>();
  const actionData   = useActionData<typeof action>();
  const navigation   = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings]       = useState("1");
  const [ingredientRows, setIngredientRows] = useState<RecipeFormIngredientRow[]>([
    { id: 1, name: "", quantity: "", unit: "g", macros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  ]);
  const [nextRowId, setNextRowId]           = useState(2);
  const [rowSuggestions, setRowSuggestions] = useState<Record<number, FoodSearchResult[]>>({});
  const [rowSearchLoading, setRowSearchLoading] = useState<Record<number, boolean>>({});
  const searchDebounceTimers = useRef<Record<number, number>>({});

  type Tab = "saved" | "create" | "browse";
  const activeTab: Tab = (searchParams.get("tab") as Tab) ?? "saved";
  function setActiveTab(tab: Tab) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  }

  function addIngredientRow() {
    setIngredientRows((prev) => [...prev, { id: nextRowId, name: "", quantity: "", unit: "g", macros: { calories: 0, protein: 0, carbs: 0, fat: 0 } }]);
    setNextRowId((p) => p + 1);
  }
  function removeIngredientRow(rowId: number) {
    setIngredientRows((prev) => prev.length === 1 ? prev : prev.filter((r) => r.id !== rowId));
  }
  function setRowValue(rowId: number, key: "name" | "quantity" | "unit", value: string) {
    setIngredientRows((prev) => prev.map((r) => r.id === rowId ? { ...r, [key]: value } : r));
  }
  function onIngredientNameChange(rowId: number, value: string) {
    setRowValue(rowId, "name", value);
    const query = value.trim();
    const timerId = searchDebounceTimers.current[rowId];
    if (timerId) clearTimeout(timerId);
    if (query.length < 2) {
      setRowSuggestions((p) => ({ ...p, [rowId]: [] }));
      setRowSearchLoading((p) => ({ ...p, [rowId]: false }));
      return;
    }
    searchDebounceTimers.current[rowId] = window.setTimeout(async () => {
      setRowSearchLoading((p) => ({ ...p, [rowId]: true }));
      try {
        const response = await searchFood(query);
        setRowSuggestions((p) => ({ ...p, [rowId]: response.results.slice(0, 6) }));
      } catch {
        setRowSuggestions((p) => ({ ...p, [rowId]: [] }));
      } finally {
        setRowSearchLoading((p) => ({ ...p, [rowId]: false }));
      }
    }, 300);
  }
  function onSelectIngredientSuggestion(rowId: number, food: FoodSearchResult) {
    setIngredientRows((prev) => prev.map((r) =>
      r.id === rowId ? { ...r, name: food.description ?? "", macros: { calories: food.macros.calories, protein: food.macros.protein, carbs: food.macros.carbs, fat: food.macros.fat } } : r
    ));
    setRowSuggestions((p) => ({ ...p, [rowId]: [] }));
  }

  function getTotalMacros(recipe: RecipeListItem) {
    const m = (recipe as any).macros;
    if (m?.total) return { calories: m.total.calories ?? 0, protein: m.total.protein ?? 0, carbs: m.total.carbs ?? 0, fat: m.total.fat ?? 0 };
    return { calories: m?.calories ?? 0, protein: m?.protein ?? 0, carbs: m?.carbs ?? m?.carbohydrates ?? 0, fat: m?.fat ?? 0 };
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-5xl p-6">
        <h1 className="text-3xl font-semibold">Recipes</h1>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b pb-0">
          {(["saved", "create", "browse"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "saved" ? "My Recipes" : tab === "create" ? "Create" : "Browse Community"}
            </button>
          ))}
        </div>

        {/* ── My Recipes ──────────────────────────────────────────────────── */}
        {activeTab === "saved" && (
          <section className="mt-4">
            {loadError && <p className="mt-3 text-sm text-red-700">{loadError}</p>}
            {!recipes.length ? (
              <p className="mt-3 text-sm text-zinc-600">No recipes yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {recipes.map((recipe) => {
                  const r     = recipe as any;
                  const total = getTotalMacros(recipe);
                  return <SavedRecipeRow key={r.id} recipe={r} total={total} />;
                })}
              </ul>
            )}
          </section>
        )}

        {/* ── Create ──────────────────────────────────────────────────────── */}
        {activeTab === "create" && (
          <section className="mt-4 rounded border p-4">
            <h2 className="text-xl font-medium">Create Recipe</h2>
            <div className="mt-4">
              <RecipeFormBlock
                name={name} description={description} servings={servings}
                submitLabel="Create Recipe" isSubmitting={isSubmitting}
                rowSuggestions={rowSuggestions} rowSearchLoading={rowSearchLoading}
                ingredientRows={ingredientRows}
                onNameChange={setName} onDescriptionChange={setDescription}
                onServingsChange={setServings} onSetRowValue={setRowValue}
                onIngredientNameChange={onIngredientNameChange}
                onSelectIngredientSuggestion={onSelectIngredientSuggestion}
                onRemoveIngredientRow={removeIngredientRow}
                onAddIngredientRow={addIngredientRow}
              />
            </div>
            {actionData?.error   && <p className="mt-3 text-sm text-red-700">{actionData.error}</p>}
            {actionData?.success && <p className="mt-3 text-sm text-green-700">{actionData.success}</p>}
          </section>
        )}

        {/* ── Browse Community ────────────────────────────────────────────── */}
        {activeTab === "browse" && (
          <section className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Recipes shared publicly by other MacroMeals users. Save any to your library.
            </p>
            {(community as any[]).length === 0 ? (
              <p className="text-sm text-zinc-600">No public recipes yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(community as any[]).map((recipe) => (
                  <CommunityCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

// ── Saved recipe row ──────────────────────────────────────────────────────────

function SavedRecipeRow({
  recipe,
  total,
}: {
  recipe: { id: number; name: string; servings: number; visibility: string; source_owner_name?: string; source_recipe_name?: string };
  total: { calories: number; protein: number; carbs: number; fat: number };
}) {
  const fetcher       = useFetcher();
  const pendingToggle = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "toggle_visibility";
  const CYCLE         = ["private", "friends_only", "public"];
  const currentVis    = recipe.visibility ?? "private";
  const displayVis    = pendingToggle
    ? CYCLE[(CYCLE.indexOf(currentVis) + 1) % CYCLE.length]
    : currentVis;

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.success) toast.success(fetcher.data.success);
    else if (fetcher.data.error) toast.error(fetcher.data.error);
  }, [fetcher.data]);

  return (
    <li className="rounded border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{recipe.name}</h3>
          <p className="text-sm text-zinc-600">Servings: {recipe.servings}</p>
        </div>
        <fetcher.Form method="post">
          <input type="hidden" name="intent"    value="toggle_visibility" />
          <input type="hidden" name="recipe_id" value={recipe.id} />
          <button
            type="submit"
            className={`text-xs rounded-full px-2.5 py-1 border font-medium transition-colors ${VISIBILITY_CLASSES[displayVis] ?? VISIBILITY_CLASSES.private}`}
          >
            {VISIBILITY_LABELS[displayVis] ?? "🔒 Private"}
          </button>
        </fetcher.Form>
      </div>

      {recipe.source_owner_name && (
        <p className="text-xs text-muted-foreground">
          Originally shared by <span className="font-medium">{recipe.source_owner_name}</span>
          {recipe.source_recipe_name ? ` · "${recipe.source_recipe_name}"` : ""}
        </p>
      )}

      <p className="text-sm">
        {total.calories} kcal | P {total.protein}g | C {total.carbs}g | F {total.fat}g
      </p>

      <div className="flex gap-3">
        <Link to={`/recipes/${recipe.id}`} className="text-sm underline">View Details</Link>
        <fetcher.Form method="post">
          <input type="hidden" name="intent"    value="delete_recipe" />
          <input type="hidden" name="recipe_id" value={recipe.id} />
          <button type="submit" className="text-sm underline text-red-600">Remove</button>
        </fetcher.Form>
      </div>
    </li>
  );
}

// ── Community recipe card ─────────────────────────────────────────────────────

function CommunityCard({ recipe }: { recipe: any }) {
  const fetcher    = useFetcher();
  const isSaving   = fetcher.state !== "idle";
  const alreadySaved = fetcher.data?.error === "You have already saved this recipe.";

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.success) toast.success(fetcher.data.success);
    else if (fetcher.data.error) toast.error(fetcher.data.error);
  }, [fetcher.data]);

  const total = recipe.macros?.total ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">{recipe.name}</CardTitle>
        <CardDescription className="text-xs">
          Shared by <span className="font-medium">{recipe.owner_name}</span>
          {" · "}{recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {recipe.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="font-semibold">{total.calories} kcal</span>
          <span>P: {total.protein}g</span>
          <span>C: {total.carbs}g</span>
          <span>F: {total.fat}g</span>
        </div>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {(recipe.ingredients ?? []).slice(0, 4).map((ing: any, i: number) => (
            <li key={i}>{ing.ingredient_name} — {ing.quantity}{ing.unit}</li>
          ))}
          {(recipe.ingredients ?? []).length > 4 && (
            <li>+{recipe.ingredients.length - 4} more</li>
          )}
        </ul>
      </CardContent>
      <CardFooter>
        <CardAction>
          <fetcher.Form method="post">
            <input type="hidden" name="intent"    value="save_community_recipe" />
            <input type="hidden" name="recipe_id" value={recipe.id} />
            <Button type="submit" size="sm" disabled={isSaving || alreadySaved} variant={alreadySaved ? "outline" : "default"}>
              {alreadySaved ? "Already saved" : isSaving ? "Saving…" : "Save to my library"}
            </Button>
          </fetcher.Form>
        </CardAction>
      </CardFooter>
    </Card>
  );
}
