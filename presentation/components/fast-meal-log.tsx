import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { searchFood, type FoodSearchResult } from "~/lib/recipes-api";

export function QuickLog({ currentDate }: { currentDate: string }) {
  const fetcher = useFetcher();
  const [mealType, setMealType] = useState("BREAKFAST");
  const [mealName, setMealName] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<number | undefined>(undefined);

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setMealName("");
      setSelectedFood(null);
    }
  }, [fetcher.state, fetcher.data]);

  function onSimpleMealNameChange(value: string) {
    setMealName(value);
    setSelectedFood(null);
    const query = value.trim();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await searchFood(query);
        setSuggestions(response.results.slice(0, 6));
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }

  return (
    <Card className="w-full border-none shadow-md bg-card/50">
      <CardHeader>
        <CardTitle>Log An Item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Which meal are you logging?
          </Label>
          <div className="flex flex-wrap gap-2">
            {["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map((type) => (
              <Button
                key={type}
                type="button"
                variant={mealType === type ? "default" : "outline"}
                onClick={() => setMealType(type)}
                className="flex-1 min-w-[100px]"
              >
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </div>

        <fetcher.Form
          method="post"
          action="/analytics/logging"
          className="space-y-6"
        >
          <input type="hidden" name="intent" value="simple" />
          <input type="hidden" name="meal_type" value={mealType} />
          <input type="hidden" name="date" value={currentDate} />

          <div className="relative space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="meal_name" className="text-sm font-medium">
                Item Name
              </Label>
            </div>
            <Input
              id="meal_name"
              name="meal_name"
              placeholder="Search food (example: chicken breast)"
              required
              value={mealName}
              onChange={(e) => onSimpleMealNameChange(e.target.value)}
              autoComplete="off"
              className="w-full"
            />
            {isSearching ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Searching USDA...
              </p>
            ) : null}
            {!!suggestions.length && (
              <ul className="absolute z-50 mt-2 max-h-56 w-full overflow-auto rounded-md border bg-background p-1 shadow-xl">
                {suggestions.map((food) => (
                  <li key={food.fdcId}>
                    <button
                      type="button"
                      onClick={() => {
                        setMealName(food.description);
                        setSelectedFood(food);
                        setSuggestions([]);
                      }}
                      className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                    >
                      <p className="font-medium">{food.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.macros.calories} kcal | P {food.macros.protein}g |
                        C {food.macros.carbs}g | F {food.macros.fat}g
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="quantity">Size</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue="100"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" defaultValue="g" required />
            </div>
          </div>

          <input
            type="hidden"
            name="fdc_id"
            value={selectedFood?.fdcId ?? ""}
          />
          <input
            type="hidden"
            name="calories_per_100g"
            value={selectedFood?.macros.calories ?? 0}
          />
          <input
            type="hidden"
            name="protein_per_100g"
            value={selectedFood?.macros.protein ?? 0}
          />
          <input
            type="hidden"
            name="carbs_per_100g"
            value={selectedFood?.macros.carbs ?? 0}
          />
          <input
            type="hidden"
            name="fat_per_100g"
            value={selectedFood?.macros.fat ?? 0}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !selectedFood}
          >
            {isSubmitting
              ? "Saving to Log..."
              : `Log to ${mealType.toLowerCase()}`}
          </Button>

          {fetcher.data?.error && (
            <p className="text-sm text-red-500 text-center font-medium mt-2">
              {fetcher.data.error}
            </p>
          )}
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}
