import { Form, Link, useSearchParams } from "react-router";
import AppHeader from "./app-header";

import type { FoodSearchResult, RecipeListItem } from "~/lib/recipes-api";

export type ActionData = {
  error?: string;
  success?: string;
};

export type IngredientRow = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export type RecipesPageProps = {
  userProfile: {
    email: string;
    first_name: string;
    last_name: string;
  };
  recipes: RecipeListItem[];
  loadError?: string;
  actionData?: ActionData;
  isSubmitting: boolean;
  ingredientRows: IngredientRow[];
  rowSuggestions?: Record<number, FoodSearchResult[]>;
  rowSearchLoading?: Record<number, boolean>;
  onSetRowValue: (
    rowId: number,
    key: "name" | "quantity" | "unit",
    value: string
  ) => void;
  onIngredientNameChange: (rowId: number, value: string) => void;
  onSelectIngredientSuggestion: (rowId: number, food: FoodSearchResult) => void;
  onRemoveIngredientRow: (rowId: number) => void;
  onAddIngredientRow: () => void;
};

export default function RecipesPage({
  userProfile,
  recipes,
  loadError,
  actionData,
  isSubmitting,
  ingredientRows,
  rowSuggestions = {},
  rowSearchLoading = {},
  onSetRowValue,
  onIngredientNameChange,
  onSelectIngredientSuggestion,
  onRemoveIngredientRow,
  onAddIngredientRow,
}: RecipesPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: "create" | "saved" =
    searchParams.get("tab") === "saved" ? "saved" : "create";

  function setActiveTab(tab: "create" | "saved") {
    // Keep tab in URL so navigation back from detail can restore Saved tab.
    const next = new URLSearchParams(searchParams);
    if (tab === "saved") {
      next.set("tab", "saved");
    } else {
      next.delete("tab");
    }
    setSearchParams(next, { replace: true });
  }

  // Important: support both old API shape (`macros.calories`) and new shape
  // (`macros.total.calories`) so saved-recipe rendering never crashes.
  function getTotalMacros(recipe: RecipeListItem) {
    const maybeAny = recipe as unknown as {
      macros?: {
        total?: { calories?: number; protein?: number; carbs?: number; fat?: number };
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
    <div className="flex flex-col min-h-screen">
      <AppHeader profile={userProfile} />

      <main className="mx-auto w-full max-w-5xl p-6">
        <h1 className="text-3xl font-semibold">Recipes</h1>
        {/* <p className="mt-2 text-sm text-zinc-600">
          This page reads from and writes to your Django recipe endpoints.
        </p> */}

      {/* Keep create flow and saved list in separate tabs for cleaner UX. */}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`rounded border px-3 py-2 text-sm ${
            activeTab === "create" ? "bg-zinc-900 text-white" : ""
          }`}
        >
          Create Recipe
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`rounded border px-3 py-2 text-sm ${
            activeTab === "saved" ? "bg-zinc-900 text-white" : ""
          }`}
        >
          Saved Recipes
        </button>
      </div>

      {activeTab === "create" ? (
        <section className="mt-4 rounded border p-4">
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
              {ingredientRows.map((row, index) => (
                <div key={row.id} className="grid grid-cols-12 gap-2">
                  <div className="relative col-span-6">
                    <input
                      name="ingredient_name"
                      required
                      value={row.name}
                      onChange={(event) => onIngredientNameChange(row.id, event.target.value)}
                      className="w-full rounded border px-3 py-2"
                      placeholder="Ingredient"
                      autoComplete="off"
                    />
                    {rowSearchLoading[row.id] && (
                      <p className="mt-1 text-xs text-zinc-500">Searching USDA...</p>
                    )}
                    {!!rowSuggestions[row.id]?.length && (
                      <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border bg-white p-1 shadow">
                        {rowSuggestions[row.id].map((food) => (
                          <li key={food.fdcId}>
                            <button
                              type="button"
                              onClick={() => onSelectIngredientSuggestion(row.id, food)}
                              className="w-full rounded px-2 py-1 text-left hover:bg-zinc-100"
                            >
                              <p className="text-sm">{food.description}</p>
                              {/* USDA branded foods include brandOwner; show it when present. */}
                              {food.brandOwner ? (
                                <p className="text-xs text-zinc-500">Brand: {food.brandOwner}</p>
                              ) : null}
                              <p className="text-xs text-zinc-600">
                                {food.macros.calories} kcal | P {food.macros.protein}g | C{" "}
                                {food.macros.carbs}g | F {food.macros.fat}g
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <input
                    name="ingredient_quantity"
                    type="number"
                    step="any"
                    min={0.01}
                    required
                    value={row.quantity}
                    onChange={(event) => onSetRowValue(row.id, "quantity", event.target.value)}
                    className="col-span-3 rounded border px-3 py-2"
                    placeholder="Size"
                  />
                  <input
                    name="ingredient_unit"
                    value={row.unit}
                    required
                    onChange={(event) => onSetRowValue(row.id, "unit", event.target.value)}
                    className="col-span-2 rounded border px-3 py-2"
                    placeholder="Unit"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveIngredientRow(row.id)}
                    disabled={ingredientRows.length === 1}
                    className="col-span-1 rounded border px-2 py-2 text-sm disabled:opacity-40"
                    aria-label={`Remove ingredient row ${index + 1}`}
                  >
                    X
                  </button>
                  <input type="hidden" name="ingredient_calories" value={row.macros.calories} />
                  <input type="hidden" name="ingredient_protein" value={row.macros.protein} />
                  <input type="hidden" name="ingredient_carbs" value={row.macros.carbs} />
                  <input type="hidden" name="ingredient_fat" value={row.macros.fat} />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onAddIngredientRow}
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
          {actionData?.success && (
            <p className="mt-3 text-sm text-green-700">{actionData.success}</p>
          )}
        </section>
      ) : (
        <section className="mt-4">
          <h2 className="text-xl font-medium">Saved Recipes</h2>
          {loadError && <p className="mt-3 text-sm text-red-700">{loadError}</p>}
          {!recipes.length ? (
            <p className="mt-3 text-sm text-zinc-600">No recipes yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recipes.map((recipe) => {
                const total = getTotalMacros(recipe);
                return (
                  <li key={recipe.id} className="rounded border p-4">
                    <h3 className="font-semibold">{recipe.name}</h3>
                    <p className="text-sm text-zinc-600">Servings: {recipe.servings}</p>
                    <p className="mt-1 text-sm">
                      Total macros: {total.calories} kcal | P {total.protein}g | C {total.carbs}g
                      {" | "}F {total.fat}g
                    </p>
                    <Link to={`/recipes/${recipe.id}`} className="mt-2 inline-block text-sm underline">
                      View Details
                    </Link>
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
