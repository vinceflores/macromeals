/**
 * routes/profile.tsx
 *
 * Profile settings page.
 * - Shows height, weight, age, biological sex (read-only display; edit via quiz).
 * - "Redo Quiz" button links to /onboarding?redo=1 to recalculate goals.
 * - Manual goal editing still works as before.
 */

import { Link, Form, redirect, useNavigation } from "react-router";
import { Fetch } from "~/lib/auth.server";
import { getSession } from "~/sessions.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { Route } from "./+types/profile";
import { useActionData } from "react-router";

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  try {
    const res = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/accounts/profile/`),
      session,
    );
    return await res.json();
  } catch {
    return redirect("/auth/login");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action
// ─────────────────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  const updates = Object.fromEntries(formData);

  const res = await Fetch(
    new Request(`${process.env.SERVER_URL}/api/accounts/profile/`, {
      method: "PATCH",
      body: JSON.stringify(updates),
      headers: { "Content-Type": "application/json" },
    }),
    session,
  );

  if (!res.ok) {
    const errorDetails = await res.json();
    console.error("Django rejected the update:", errorDetails);
    return { error: "Failed to update profile", details: errorDetails };
  }
  return { success: true, message: "Profile updated successfully!" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert decimal cm to a "X ft Y in" display string */
function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${ft} ft ${inches} in`;
}

/** Convert kg to lbs string */
function kgToLbs(kg: number): string {
  return (kg * 2.20462).toFixed(1);
}

const SEX_LABELS: Record<string, string> = {
  male:   "Male",
  female: "Female",
  other:  "Prefer not to say",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Profile({ loaderData }: Route.ComponentProps) {
  const actionData  = useActionData<any>();
  const navigation  = useNavigation();
  const isUpdating  = navigation.state === "submitting";

  const hasPhysicalStats =
    loaderData.height_cm != null &&
    loaderData.weight_kg != null &&
    loaderData.age       != null;

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h1 className="text-3xl font-bold text-primary">Profile Settings</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" asChild size="sm">
            <Link to="/auth/reset-password">Reset Password</Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link to="/onboarding?redo=1">
              {loaderData.onboarding_complete ? "Redo Goals Quiz" : "Start Goals Quiz"}
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Physical Stats (read-only, set via quiz) ────────────────────── */}
      <section className="space-y-4 border rounded-xl p-5 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Physical Stats</h2>
            <p className="text-sm text-muted-foreground">
              Used to calculate your calorie and macro goals.
              Edit these by redoing the quiz.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/onboarding?redo=1">✏️ Edit</Link>
          </Button>
        </div>

        {hasPhysicalStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat
              label="Height"
              value={`${loaderData.height_cm} cm`}
              sub={cmToFtIn(loaderData.height_cm)}
            />
            <Stat
              label="Weight"
              value={`${loaderData.weight_kg} kg`}
              sub={`${kgToLbs(loaderData.weight_kg)} lbs`}
            />
            <Stat
              label="Age"
              value={`${loaderData.age} yrs`}
            />
            <Stat
              label="Biological Sex"
              value={SEX_LABELS[loaderData.biological_sex] ?? loaderData.biological_sex ?? "—"}
            />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              🎯 No physical stats yet. Take the quiz to get personalised goals.
            </p>
            <Button size="sm" asChild>
              <Link to="/onboarding">Start Quiz</Link>
            </Button>
          </div>
        )}
      </section>

      {/* ── Editable form ──────────────────────────────────────────────── */}
      <Form method="post" className="space-y-8">

        {/* Personal Info */}
        <div className="space-y-4 border-b pb-6">
          <h2 className="text-xl font-semibold">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input name="first_name" defaultValue={loaderData.first_name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input name="last_name" defaultValue={loaderData.last_name} />
            </div>
          </div>
        </div>

        {/* Nutrition Goals */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Daily Nutritional Goals</h2>
            <p className="text-sm text-muted-foreground">
              These are{" "}
              {loaderData.onboarding_complete
                ? "auto-calculated from your quiz — you can fine-tune them here."
                : "default values. Complete the quiz for personalised recommendations."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protein_goal">Protein (%)</Label>
              <Input
                type="number"
                name="protein_goal"
                defaultValue={loaderData.protein_goal}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs_goal">Carbs (%)</Label>
              <Input
                type="number"
                name="carbs_goal"
                defaultValue={loaderData.carbs_goal}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat_goal">Fats (%)</Label>
              <Input
                type="number"
                name="fat_goal"
                defaultValue={loaderData.fat_goal}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="water_goal">Water (mL)</Label>
              <Input
                type="number"
                name="water_goal"
                defaultValue={loaderData.water_goal}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily_calorie_goal">Total Calories (kcal)</Label>
              <Input
                type="number"
                name="daily_calorie_goal"
                defaultValue={loaderData.daily_calorie_goal}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isUpdating} className="w-full md:w-auto">
          {isUpdating ? "Saving…" : "Update Profile"}
        </Button>

        {actionData?.success && (
          <div className="p-4 text-sm text-green-800 rounded-lg bg-green-50 border border-green-200">
            {actionData.message}
          </div>
        )}
        {actionData?.error && (
          <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200">
            {actionData.error}
          </div>
        )}
      </Form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small stat display component
// ─────────────────────────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
