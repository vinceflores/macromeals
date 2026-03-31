/**
 * presentation/app/routes/friends-recipes.tsx
 *
 * Shows a friend's public + friends_only recipes.
 * Accessed via /friends/:id/recipes
 */

import { data, redirect, useLoaderData, useFetcher } from "react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Link } from "react-router";
import { Fetch } from "~/lib/auth.server";
import { getSession } from "~/sessions.server";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/friends-recipes";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Ingredient = {
  ingredient_name: string;
  quantity: number;
  unit: string;
};

type Macros = {
  total: { calories: number; protein: number; carbs: number; fat: number };
  perServing: { calories: number; protein: number; carbs: number; fat: number };
};

type Recipe = {
  id: number;
  name: string;
  description: string;
  servings: number;
  visibility: string;
  owner_name: string;
  ingredients: Ingredient[];
  macros: Macros;
};

type LoaderData = {
  recipes: Recipe[];
  friendName: string;
  error?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  const userId = params.id;

  try {
    const res = await Fetch(
      new Request(
        `${process.env.SERVER_URL}/api/accounts/friends/${userId}/recipes/`,
      ),
      session,
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return data<LoaderData>({
        recipes: [],
        friendName: "Friend",
        error: body?.detail ?? `HTTP ${res.status}`,
      });
    }

    const recipes = (await res.json()) as Recipe[];
    const friendName = recipes[0]?.owner_name ?? "Friend";

    return data<LoaderData>({ recipes, friendName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load recipes.";
    return data<LoaderData>({ recipes: [], friendName: "Friend", error: message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action — save a recipe to your own library
// ─────────────────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  const form     = await request.formData();
  const recipeId = form.get("recipe_id");

  try {
    const res = await Fetch(
      new Request(`${process.env.SERVER_URL}/recipe/${recipeId}/save/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      session,
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return data({ success: false, message: body?.detail ?? "Failed to save recipe." });
    }

    return data({ success: true, message: "Recipe saved to your library!" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save recipe.";
    return data({ success: false, message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function FriendRecipesPage() {
  const { recipes, friendName, error } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/friends?tab=friends" className="text-sm underline text-muted-foreground">
          ← Back to Friends
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{friendName}'s Recipes</h1>
        <p className="text-muted-foreground mt-1">
          Showing shared and public recipes.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!error && recipes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This friend hasn't shared any recipes yet.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map((recipe) => (
          <FriendRecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recipe card
// ─────────────────────────────────────────────────────────────────────────────

function FriendRecipeCard({ recipe }: { recipe: Recipe }) {
  const fetcher    = useFetcher();
  const isSaving   = fetcher.state !== "idle";
  const alreadySaved = fetcher.data?.message === "You have already saved this recipe.";

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.success) toast.success(fetcher.data.message);
    else toast.error(fetcher.data.message);
  }, [fetcher.data]);

  const total = recipe.macros?.total ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const visibilityBadge = recipe.visibility === "friends_only"
    ? "👥 Friends only"
    : "🌐 Public";

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{recipe.name}</h3>
        <span className="text-xs text-muted-foreground shrink-0">{visibilityBadge}</span>
      </div>

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
        {recipe.ingredients.slice(0, 4).map((ing, i) => (
          <li key={i}>{ing.ingredient_name} — {ing.quantity}{ing.unit}</li>
        ))}
        {recipe.ingredients.length > 4 && (
          <li>+{recipe.ingredients.length - 4} more</li>
        )}
      </ul>

      <fetcher.Form method="post">
        <input type="hidden" name="recipe_id" value={recipe.id} />
        <Button
          type="submit"
          size="sm"
          className="w-full"
          disabled={isSaving || alreadySaved}
          variant={alreadySaved ? "outline" : "default"}
        >
          {alreadySaved ? "Already saved" : isSaving ? "Saving…" : "Save to my library"}
        </Button>
      </fetcher.Form>
    </div>
  );
}
