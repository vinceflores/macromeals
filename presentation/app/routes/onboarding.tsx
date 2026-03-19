/**
 * routes/onboarding.tsx
 *
 * Multi-step onboarding quiz.
 * - Loader: requires auth; if onboarding_complete === true AND the user
 *   didn't arrive via the "redo" flag, redirect to home.
 * - Action: POST quiz answers to /api/accounts/onboarding/, then redirect home.
 * - Supports both metric (cm / kg) and imperial (ft + in / lbs) input.
 *   Imperial values are converted to metric before submission.
 */

import { redirect, useNavigation, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/onboarding";
import { getSession } from "~/sessions.server";
import { Fetch } from "~/lib/auth.server";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type UnitSystem = "metric" | "imperial";
type BiologicalSex = "male" | "female" | "other";
type FitnessGoal = "lose_weight" | "maintain" | "gain_muscle" | "general";

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  const url = new URL(request.url);
  const redo = url.searchParams.get("redo") === "1";

  const res = await Fetch(
    new Request(`${process.env.SERVER_URL}/api/accounts/profile/`),
    session,
  );
  const profile = await res.json();

  // If already completed and not redoing, send them home
  if (profile.onboarding_complete && !redo) {
    return redirect("/");
  }

  return { profile };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action
// ─────────────────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();

  const unitSystem  = formData.get("unit_system") as UnitSystem;
  const biologicalSex = formData.get("biological_sex") as string;
  const age         = Number(formData.get("age"));
  const exerciseDays = Number(formData.get("exercise_days_per_week"));
  const fitnessGoal = formData.get("fitness_goal") as string;

  // Convert to metric
  let heightCm: number;
  let weightKg: number;

  if (unitSystem === "imperial") {
    const feet   = Number(formData.get("height_ft"));
    const inches = Number(formData.get("height_in"));
    const lbs    = Number(formData.get("weight_lbs"));
    heightCm = ((feet * 12) + inches) * 2.54;
    weightKg = lbs / 2.20462;
  } else {
    heightCm = Number(formData.get("height_cm"));
    weightKg = Number(formData.get("weight_kg"));
  }

  const payload = {
    height_cm:              parseFloat(heightCm.toFixed(2)),
    weight_kg:              parseFloat(weightKg.toFixed(2)),
    age,
    biological_sex:         biologicalSex,
    exercise_days_per_week: exerciseDays,
    fitness_goal:           fitnessGoal,
  };

  const res = await Fetch(
    new Request(`${process.env.SERVER_URL}/api/accounts/onboarding/`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    }),
    session,
  );

  if (!res.ok) {
    const err = await res.json();
    return { error: "Something went wrong. Please check your inputs.", details: err };
  }

  const result = await res.json();
  return redirect("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const GOAL_OPTIONS: { value: FitnessGoal; label: string; description: string; emoji: string }[] = [
  {
    value: "lose_weight",
    label: "Lose Weight",
    description: "Caloric deficit to shed body fat",
    emoji: "🔥",
  },
  {
    value: "maintain",
    label: "Maintain Weight",
    description: "Eat at maintenance to stay where you are",
    emoji: "⚖️",
  },
  {
    value: "gain_muscle",
    label: "Gain Muscle",
    description: "Caloric surplus to support muscle growth",
    emoji: "💪",
  },
  {
    value: "general",
    label: "Improve Nutrition",
    description: "Better macro balance without a specific weight goal",
    emoji: "🥗",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData  = useActionData<typeof action>();
  const navigation  = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [step, setStep]               = useState(1);
  const [unitSystem, setUnitSystem]   = useState<UnitSystem>("metric");
  const [sex, setSex]                 = useState<BiologicalSex | "">("");
  const [age, setAge]                 = useState("");
  const [heightCm, setHeightCm]       = useState("");
  const [heightFt, setHeightFt]       = useState("");
  const [heightIn, setHeightIn]       = useState("");
  const [weightKg, setWeightKg]       = useState("");
  const [weightLbs, setWeightLbs]     = useState("");
  const [exerciseDays, setExerciseDays] = useState("3");
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | "">("");

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  const canAdvance = () => {
    switch (step) {
      case 1: return sex !== "";
      case 2: return age !== "" && Number(age) >= 13 && Number(age) <= 120;
      case 3:
        if (unitSystem === "metric") return heightCm !== "" && weightKg !== "";
        return heightFt !== "" && weightLbs !== "";
      case 4: return true; // exercise days has a default
      case 5: return fitnessGoal !== "";
      default: return false;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-lg mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {profile.onboarding_complete ? "Update Your Goals" : "Let's set up your goals"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {profile.onboarding_complete
            ? "Recalculate your recommended calories and macros."
            : "Answer a few quick questions so we can calculate your personalised calorie and macro targets."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-card border rounded-2xl shadow-sm p-8 space-y-6">

        {/* ── Step 1: Biological sex ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What's your gender?</h2>
            <p className="text-sm text-muted-foreground">
              Used only for calorie estimation via the Mifflin-St Jeor equation.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { value: "male",   label: "Male",   emoji: "♂" },
                  { value: "female", label: "Female", emoji: "♀" },
                  { value: "other",  label: "Prefer not to say", emoji: "⊕" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSex(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all",
                    sex === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Age ──────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">How old are you?</h2>
            <p className="text-sm text-muted-foreground">
              Age affects your basal metabolic rate.
            </p>
            <div className="space-y-2">
              <Label htmlFor="age">Age (years)</Label>
              <Input
                id="age"
                type="number"
                min={13}
                max={120}
                placeholder="e.g. 25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="text-lg"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* ── Step 3: Height & Weight ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Height &amp; Weight</h2>
              {/* Unit toggle */}
              <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setUnitSystem("metric")}
                  className={cn(
                    "px-3 py-1.5 transition-colors",
                    unitSystem === "metric"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  Metric
                </button>
                <button
                  type="button"
                  onClick={() => setUnitSystem("imperial")}
                  className={cn(
                    "px-3 py-1.5 transition-colors",
                    unitSystem === "imperial"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  Imperial
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Used to calculate your Basal Metabolic Rate.
            </p>

            {unitSystem === "metric" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height_cm">Height (cm)</Label>
                  <Input
                    id="height_cm"
                    type="number"
                    min={50}
                    max={280}
                    placeholder="e.g. 175"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_kg">Weight (kg)</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    min={20}
                    max={500}
                    placeholder="e.g. 75"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height_ft">Height — feet</Label>
                    <Input
                      id="height_ft"
                      type="number"
                      min={1}
                      max={9}
                      placeholder="5"
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height_in">inches</Label>
                    <Input
                      id="height_in"
                      type="number"
                      min={0}
                      max={11}
                      placeholder="9"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_lbs">Weight (lbs)</Label>
                  <Input
                    id="weight_lbs"
                    type="number"
                    min={44}
                    max={1100}
                    placeholder="165"
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Exercise frequency ───────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">How many days a week do you exercise?</h2>
            <p className="text-sm text-muted-foreground">
              Count any day you do at least 30 minutes of intentional physical activity.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">0 days</span>
                <span className="text-2xl font-bold tabular-nums w-12 text-center">
                  {exerciseDays}
                </span>
                <span className="text-sm text-muted-foreground">7 days</span>
              </div>
              <input
                type="range"
                min={0}
                max={7}
                step={1}
                value={exerciseDays}
                onChange={(e) => setExerciseDays(e.target.value)}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
            {/* Contextual label */}
            <p className="text-sm text-center text-muted-foreground pt-1">
              {Number(exerciseDays) === 0 && "Sedentary — little or no exercise"}
              {Number(exerciseDays) <= 2 && Number(exerciseDays) >= 1 && "Lightly active"}
              {Number(exerciseDays) <= 4 && Number(exerciseDays) >= 3 && "Moderately active"}
              {Number(exerciseDays) <= 6 && Number(exerciseDays) >= 5 && "Very active"}
              {Number(exerciseDays) === 7 && "Extra active — daily training"}
            </p>
          </div>
        )}

        {/* ── Step 5: Fitness goal ─────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What's your primary goal?</h2>
            <p className="text-sm text-muted-foreground">
              This determines your calorie target and macro split.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFitnessGoal(opt.value)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                    fitnessGoal === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <div>
                    <p className="font-semibold">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {"error" in (actionData ?? {}) && (
          <div className="p-3 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
            {(actionData as any).error}
          </div>
        )}

        {/* ── Navigation buttons ───────────────────────────────────────────── */}
        <div className="flex justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Back
          </Button>

          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
            >
              Continue
            </Button>
          ) : (
            // Final step — build a hidden form and submit it programmatically
            <form method="post" id="onboarding-form" className="contents">
              <input type="hidden" name="unit_system"            value={unitSystem} />
              <input type="hidden" name="biological_sex"         value={sex} />
              <input type="hidden" name="age"                    value={age} />
              <input type="hidden" name="height_cm"              value={unitSystem === "metric" ? heightCm : ""} />
              <input type="hidden" name="weight_kg"              value={unitSystem === "metric" ? weightKg : ""} />
              <input type="hidden" name="height_ft"              value={unitSystem === "imperial" ? heightFt : ""} />
              <input type="hidden" name="height_in"              value={unitSystem === "imperial" ? heightIn : ""} />
              <input type="hidden" name="weight_lbs"             value={unitSystem === "imperial" ? weightLbs : ""} />
              <input type="hidden" name="exercise_days_per_week" value={exerciseDays} />
              <input type="hidden" name="fitness_goal"           value={fitnessGoal} />
              <Button
                type="submit"
                form="onboarding-form"
                disabled={!canAdvance() || isSubmitting}
              >
                {isSubmitting ? "Calculating…" : "Calculate my goals 🎯"}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-6 max-w-lg text-center text-xs text-muted-foreground">
        Goals are calculated using the Mifflin-St Jeor equation and standard
        macronutrient guidelines. These are estimates — adjust them anytime in
        your profile settings.
      </p>
    </div>
  );
}
