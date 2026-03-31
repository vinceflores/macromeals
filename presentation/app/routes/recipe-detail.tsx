/**
 * presentation/app/routes/recipe-detail.tsx
 * Updated: 3-way visibility cycle, attribution display
 */

import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useFetcher,
} from "react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Fetch } from "~/lib/auth.server";
import type { RecipeDetail } from "~/lib/recipes-api";
import { getSession } from "~/sessions.server";
import type { Route } from "./+types/recipe-detail";

type Profile = { email: string; first_name: string; last_name: string };
type ExtendedRecipeDetail = RecipeDetail & {
  visibility: string;
  owner_name: string;
  source_recipe_id?: number | null;
  source_recipe_name?: string | null;
  source_owner_name?: string | null;
};
type LoaderData = {
  profile: Profile;
  recipe: ExtendedRecipeDetail | null;
  error?: string;
};
type ActionData = { error?: string; success?: string };

const EMPTY_PROFILE: Profile = { email: "", first_name: "", last_name: "" };

const VISIBILITY_LABELS: Record<string, string> = {
  private: "🔒 Private",
  friends_only: "👥 Friends",
  public: "🌐 Public",
};
const VISIBILITY_CLASSES: Record<string, string> = {
  private: "border-zinc-300 bg-zinc-50 text-zinc-500 hover:bg-zinc-100",
  friends_only: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
  public: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100",
};

export function meta(_: Route.MetaArgs) {
  return [{ title: "Recipe Details" }];
}

function normalizeMacros(recipe: RecipeDetail) {
  const flat = recipe.macros as any;
  const total = recipe.macros?.total ?? {
    calories: flat.calories ?? 0,
    protein: flat.protein ?? 0,
    carbs: flat.carbs ?? flat.carbohydrates ?? 0,
    fat: flat.fat ?? 0,
  };
  const servings = Math.max(Number(recipe.servings) || 1, 1);
  const perServing = {
    calories: Math.round((total.calories / servings) * 100) / 100,
    protein: Math.round((total.protein / servings) * 100) / 100,
    carbs: Math.round((total.carbs / servings) * 100) / 100,
    fat: Math.round((total.fat / servings) * 100) / 100,
  };
  return { total, perServing };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1)
    return data<LoaderData>(
      { profile: EMPTY_PROFILE, recipe: null, error: "Invalid recipe ID." },
      { status: 400 },
    );
  try {
    const [profileRes, recipeRes] = await Promise.all([
      Fetch(
        new Request(`${process.env.SERVER_URL}/api/accounts/profile/`),
        session,
      ),
      Fetch(
        new Request(`${process.env.SERVER_URL}/recipe/${id}/`, {
          headers: { "Content-Type": "application/json" },
        }),
        session,
      ),
    ]);
    const profile = (await profileRes.json()) as Profile;
    const recipe = (await recipeRes.json()) as ExtendedRecipeDetail;
    return data<LoaderData>({ profile, recipe });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load recipe.";
    return data<LoaderData>(
      { profile: EMPTY_PROFILE, recipe: null, error: message },
      { status: 404 },
    );
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1)
    return data<ActionData>({ error: "Invalid recipe ID." }, { status: 400 });
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "delete_recipe") {
    try {
      const response = await Fetch(
        new Request(`${process.env.SERVER_URL}/recipe/${id}/`, {
          method: "DELETE",
        }),
        session,
      );
      if (!response.ok && response.status !== 204)
        return data<ActionData>(
          { error: `HTTP ${response.status}` },
          { status: 400 },
        );
      return redirect("/recipes?tab=saved");
    } catch (e) {
      return data<ActionData>(
        { error: e instanceof Error ? e.message : "Failed." },
        { status: 400 },
      );
    }
  }

  if (intent === "toggle_visibility") {
    try {
      const res = await Fetch(
        new Request(`${process.env.SERVER_URL}/recipe/${id}/visibility/`, {
          method: "PATCH",
        }),
        session,
      );
      if (!res.ok)
        return data<ActionData>(
          { error: `HTTP ${res.status}` },
          { status: 400 },
        );
      const updated = await res.json();
      return data<ActionData>({
        success: `Recipe is now ${VISIBILITY_LABELS[updated.visibility] ?? updated.visibility}.`,
      });
    } catch (e) {
      return data<ActionData>(
        { error: e instanceof Error ? e.message : "Failed." },
        { status: 400 },
      );
    }
  }

  return data<ActionData>({ error: "Unknown action." }, { status: 400 });
}

export default function RecipeDetailRoute() {
  const { profile, recipe, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const macros = recipe ? normalizeMacros(recipe) : null;
  const isSubmitting = navigation.state === "submitting";

  const CYCLE = ["private", "friends_only", "public"];
  const pendingToggle =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "toggle_visibility";
  const currentVis = recipe?.visibility ?? "private";
  const displayVis = pendingToggle
    ? CYCLE[(CYCLE.indexOf(currentVis) + 1) % CYCLE.length]
    : currentVis;

  useEffect(() => {
    if (actionData?.success) toast.success(actionData.success);
    if (actionData?.error) toast.error(actionData.error);
  }, [actionData]);

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <Link to="/recipes?tab=saved" className="text-sm underline">
        Back to Recipes
      </Link>

      {!recipe || error || !macros ? (
        <>
          <h1 className="mt-4 text-2xl font-semibold">Recipe not available</h1>
          <p className="mt-2 text-sm text-red-700">
            {error ?? "Unknown error."}
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold">{recipe.name}</h1>
              {recipe.source_owner_name && (
                <p className="text-sm text-muted-foreground">
                  Originally shared by{" "}
                  <span className="font-medium">
                    {recipe.source_owner_name}
                  </span>
                  {recipe.source_recipe_name
                    ? ` · "${recipe.source_recipe_name}"`
                    : ""}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {/* Visibility cycle toggle */}
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="toggle_visibility" />
                <button
                  type="submit"
                  className={`text-xs rounded-full px-3 py-1.5 border font-medium transition-colors ${VISIBILITY_CLASSES[displayVis] ?? VISIBILITY_CLASSES.private}`}
                >
                  {VISIBILITY_LABELS[displayVis] ?? "🔒 Private"}
                </button>
              </fetcher.Form>

              <Link
                to={`/edit/recipe/${recipe.id}`}
                className="rounded border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Edit
              </Link>

              <Form method="post">
                <input type="hidden" name="intent" value="delete_recipe" />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {isSubmitting ? "Removing..." : "Remove"}
                </button>
              </Form>
            </div>
          </div>

          <p className="mt-2 text-sm text-zinc-600">
            Servings: {recipe.servings}
          </p>
          {recipe.description && <p className="mt-3">{recipe.description}</p>}

          <section className="mt-6 rounded border p-4">
            <h2 className="text-xl font-medium">Ingredients</h2>
            <ul className="mt-3 space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li
                  key={`${ingredient.ingredient_name}-${index}`}
                  className="text-sm"
                >
                  {ingredient.ingredient_name}: {ingredient.quantity}{" "}
                  {ingredient.unit}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded border p-4">
            <h2 className="text-xl font-medium">Macros</h2>
            <p className="mt-2 text-sm">
              Total: {macros.total.calories} kcal | P {macros.total.protein}g |
              C {macros.total.carbs}g | F {macros.total.fat}g
            </p>
            <p className="mt-1 text-sm">
              Per serving: {macros.perServing.calories} kcal | P{" "}
              {macros.perServing.protein}g | C {macros.perServing.carbs}g | F{" "}
              {macros.perServing.fat}g
            </p>
          </section>
        </>
      )}
    </div>
  );
}
