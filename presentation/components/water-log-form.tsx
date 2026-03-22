import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function WaterForm({
  action,
  currentDate,
}: {
  action?: string;
  currentDate: string;
}) {
  const fetcher = useFetcher();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const isSuccess = fetcher.data?.success;
  const isLogging = fetcher.state !== "idle";
  const hasValidInput = inputValue.trim() !== "" && Number(inputValue) > 0;

  useEffect(() => {
    if (fetcher.state === "idle" && isSuccess) {
      setInputValue("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [fetcher.state, isSuccess]);

  return (
    <Card className="w-full border-none shadow-md bg-card/50">
      <CardHeader>
        <CardTitle>Log Water</CardTitle>
      </CardHeader>
      <CardContent>
        <fetcher.Form
          className="space-y-6"
          action={action || "/analytics/logging/water"}
          method="post"
        >
          <input type="hidden" name="date" value={currentDate} />

          <div className="space-y-2">
            <Label
              htmlFor="water"
              className="text-sm font-medium text-muted-foreground"
            >
              Amount (ml)
            </Label>
            <Input
              ref={inputRef}
              id="water"
              name="water"
              placeholder="1000"
              type="number"
              min="1"
              required
              disabled={isLogging}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-background/50 border-muted"
            />
          </div>

          <Button
            type="submit"
            variant="default"
            disabled={isLogging || !hasValidInput}
            className="w-full"
          >
            {isLogging ? "Logging..." : "Log Water"}
          </Button>

          <div className="min-h-[20px] flex justify-center mt-2">
            {isSuccess && (
              <p className="text-sm text-green-500 font-medium animate-in fade-in slide-in-from-top-1">
                Water logged successfully!
              </p>
            )}
            {fetcher.data?.error && (
              <p className="text-sm text-red-500 font-medium">
                {fetcher.data.error}
              </p>
            )}
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}
