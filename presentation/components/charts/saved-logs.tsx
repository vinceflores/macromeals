import { Form, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface MealLogIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface MealLog {
  id: number;
  meal_name: string;
  recipe_name: string,
  description: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  created_at: string;
  date_logged?: string;
  ingredients?: MealLogIngredient[];
}

interface SavedLogsProps {
  logs: MealLog[];
  currentDate: string;
  error?: string;
}

export function SavedLogs({ logs = [], currentDate, error }: SavedLogsProps) {
  const mealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

  return (
    <Card className="w-full border-none shadow-md bg-card/50">
      <CardHeader>
        <CardTitle>Saved Meal Logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {mealTypes.map((type) => {
          const safeLogs = Array.isArray(logs) ? logs : [];
          
          const typeLogs = safeLogs.filter((l) => {
            if (l.meal_name?.toUpperCase() !== type) return false;
            const logDateValue = l.date_logged || l.created_at;
            return logDateValue?.split("T")[0] === currentDate;
          });

          return (
            <div key={type} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                {type}
              </h3>

              {typeLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-2">
                  No {type.toLowerCase()} logged.
                </p>
              ) : (
                typeLogs.map((log) => {
                  const ingredient = log.ingredients?.[0];
                  const rawName =
                   log.recipe_name || "Unnamed Meal";
                  const displayName = rawName
                    .toLowerCase()
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");

                  return (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 shadow-sm bg-card"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                          <p className="font-semibold text-lg tracking-tight leading-none">
                            {displayName}
                          </p>

                          {ingredient && (
                            <p className="text-xs text-muted-foreground">
                              {ingredient.quantity}
                              {ingredient.unit?.toLowerCase()}{" "}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <Link
                            to={`/edit/log/${log.id}`}
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            Edit
                          </Link>
                          <Form
                              method="post"
                              action={`/analytics/logging?date=${currentDate}`} 
                              className="inline-flex"
                          >
                            <input
                              type="hidden"
                              name="intent"
                              value="delete_log"
                            />
                            <input type="hidden" name="log_id" value={log.id} />
                            <button
                              type="submit"
                              className="text-sm text-red-600 font-medium hover:underline bg-transparent p-0 cursor-pointer"
                            >
                              Remove
                            </button>
                          </Form>
                        </div>
                      </div>

                      <div className="text-xs font-medium text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t">
                        <span className="text-foreground font-bold">
                          {log.calories} kcal
                        </span>
                        <span>P: {log.protein}g</span>
                        <span>C: {log.carbohydrates}g</span>
                        <span>F: {log.fat}g</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
