import { Link, Form, redirect, useNavigation } from "react-router";
import { Fetch } from "~/lib/auth.server";
import { getSession } from "~/sessions.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { Route } from "./+types/profile";
import { useActionData } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  try {
    const res = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/accounts/profile/`),
      session,
    );
    return await res.json();
  } catch (error) {
    return redirect("/auth/login");
  }
}

export async function action({ request }: Route.ActionArgs) {
  console.log("action triggered");
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();

  const updates = Object.fromEntries(formData);

  const backendUrl = `${process.env.SERVER_URL}/api/accounts/profile/`;

  const res = await Fetch(
    new Request(backendUrl, {
      method: "PATCH",
      body: JSON.stringify(updates),
      headers: {
        "Content-Type": "application/json",
      },
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

export default function Profile({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<any>();
  const navigation = useNavigation();
  const isUpdating = navigation.state === "submitting";

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-10">
      
      <section className="space-y-4">
        <h1 className="text-3xl font-bold text-primary">Profile Settings</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild size="sm">
            <Link to="/auth/reset-password">Reset Password</Link>
          </Button>
        </div>
      </section>

      <Form method="post" className="space-y-8">
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

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Daily Nutritional Goals</h2>
          <p className="text-sm text-muted-foreground">
            Set your daily nutritional goals.
          </p>

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

        <Button
          type="submit"
          disabled={isUpdating}
          className="w-full md:w-auto"
        >
          {isUpdating ? "Saving..." : "Update Profile"}
        </Button>

        {actionData?.success && (
          <div className="p-4 text-sm text-green-800 rounded-lg bg-green-50 border border-green-200">
            {actionData.message}
          </div>
        )}
      </Form>
    </div>
  );
}
