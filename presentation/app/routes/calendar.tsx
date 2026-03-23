import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  data,
  Link,
  redirect,
  useLoaderData,
  useSearchParams,
} from "react-router";

import {
  CaloriesStat,
  MacroStats,
  WaterStat,
} from "components/charts/macro-stats";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import type { Route } from "./+types/calendar";
import { getSession } from "~/sessions.server";
import { Fetch } from "~/lib/auth.server";
import { SavedLogs } from "components/charts/saved-logs";
import { getLocalToday } from "~/lib/date";
type ViewMode = "month" | "week" | "day";

type MealLogIngredient = {
  name: string;
  quantity: number;
  unit: string;
};

type MealLog = {
  id: number;
  meal_name: string;
  description: string;
  ingredients: MealLogIngredient[];
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  created_at: string;
  date_logged?: string;
};

type DailyProgress = {
  current: {
    calories: number;
    fat: number;
    protein: number;
    carbohydrates: number;
    water: number;
  };
  goal: {
    calories: number;
    fat: number;
    protein: number;
    carbohydrates: number;
    water: number;
  };
};

type MacroPoint = {
  key: string;
  label: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
};

function formatDateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function parseDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

function sameDay(a: Date, b: Date) {
  return formatDateKey(a) === formatDateKey(b);
}

function getLogDate(log: MealLog) {
  return (log.date_logged || log.created_at || "").split("T")[0];
}

function addDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate);
  nextDate.setDate(baseDate.getDate() + days);
  return nextDate;
}

function getDailyTotals(logs: MealLog[]) {
  return logs.reduce(
    (acc, log) => {
      acc.calories += Number(log.calories || 0);
      acc.protein += Number(log.protein || 0);
      acc.carbohydrates += Number(log.carbohydrates || 0);
      acc.fat += Number(log.fat || 0);
      return acc;
    },
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
  );
}

function groupLogsByDate(logs: MealLog[]) {
  return logs.reduce<Record<string, MealLog[]>>((acc, log) => {
    const key = getLogDate(log);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});
}

function getWeekChartData(
  selectedDate: Date,
  logsByDate: Record<string, MealLog[]>,
  waterByDate: Record<string, number>,
) {
  const start = addDays(selectedDate, -selectedDate.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const key = formatDateKey(date);
    const totals = getDailyTotals(logsByDate[key] ?? []);

    return {
      key,
      label: date.toLocaleDateString("en-CA", { weekday: "short" }),
      ...totals,
      water: waterByDate[key] || 0,
    };
  });
}

function getMonthChartData(
  selectedDate: Date,
  logsByDate: Record<string, MealLog[]>,
  waterByDate: Record<string, number> = {},
) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const date = parseDate(dateStr);

    const key = formatDateKey(date);
    const totals = getDailyTotals(logsByDate[key] ?? []);

    return {
      key,
      label: String(day),
      ...totals,
      water: waterByDate[key] || 0,
    };
  });
}

function getMealSummary(log: MealLog) {
  if (log.ingredients?.length) {
    return log.ingredients
      .slice(0, 3)
      .map(
        (ingredient) =>
          `${ingredient.name} (${ingredient.quantity}${ingredient.unit})`,
      )
      .join(", ");
  }

  return log.description?.trim() || "No meal details saved.";
}

function getHoverPreview(logs: MealLog[]) {
  const mealGroups = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

  return mealGroups
    .map((mealType) => ({
      mealType,
      logs: logs.filter((log) => log.meal_name === mealType),
    }))
    .filter((group) => group.logs.length > 0);
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Calendar | MacroMeals" },
    {
      name: "description",
      content: "View meals and macro trends by month, week, or day.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.data.access) {
    return redirect("/auth/login");
  }

  const url = new URL(request.url);
  const currentDate = url.searchParams.get("date") || getLocalToday();

  try {
    const [allLogsRes, selectedDayLogsRes, progressRes, waterRes] =
      await Promise.all([
        Fetch(new Request(`${process.env.SERVER_URL}/api/logging/`), session),
        Fetch(
          new Request(
            `${process.env.SERVER_URL}/api/logging/?date=${currentDate}`,
          ),
          session,
        ),
        Fetch(
          new Request(
            `${process.env.SERVER_URL}/api/analytics/progress/?date=${currentDate}`,
          ),
          session,
        ),
        Fetch(
          new Request(`${process.env.SERVER_URL}/api/logging/water/history/`),
          session,
        ),
      ]);

    const allLogsBody = await allLogsRes.json();
    const selectedDayLogsBody = await selectedDayLogsRes.json();
    const progress = (await progressRes.json()) as DailyProgress;
    const waterHistory = await waterRes.json();

    return data({
      allLogs: (allLogsBody.results ?? []) as MealLog[],
      selectedDayLogs: (selectedDayLogsBody.results ?? []) as MealLog[],
      progress,
      waterHistory,
      currentDate,
      error: undefined as string | undefined,
    });
  } catch (error) {
    return data({
      allLogs: [] as MealLog[],
      selectedDayLogs: [] as MealLog[],
      progress: {
        current: {
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          water: 0,
        },
        goal: {
          calories: 2000,
          protein: 150,
          carbohydrates: 250,
          fat: 70,
          water: 2000,
        },
      } as DailyProgress,
      waterHistory: [],
      currentDate,
      error: String(error),
    });
  }
}

export default function CalendarPage() {
  const {
    allLogs,
    selectedDayLogs,
    progress,
    currentDate,
    waterHistory,
    error,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedDate = parseDate(currentDate);
  const view = (searchParams.get("view") as ViewMode) || "month";
  const logsByDate = groupLogsByDate(allLogs);

  const waterByDate = (waterHistory ?? []).reduce((acc: any, log: any) => {
    acc[log.date_logged] = log.water;
    return acc;
  }, {});

  const weekChartData = getWeekChartData(selectedDate, logsByDate, waterByDate);
  const monthChartData = getMonthChartData(
    selectedDate,
    logsByDate,
    waterByDate,
  );

  function setView(nextView: ViewMode) {
    const next = new URLSearchParams(searchParams);
    next.set("view", nextView);
    setSearchParams(next, { replace: true });
  }

  function setSelectedDate(date: Date) {
    const next = new URLSearchParams(searchParams);
    next.set("date", formatDateKey(date));
    if (view !== "day") next.set("view", "day");
    setSearchParams(next, { replace: true });
  }

  function goToToday() {
    const next = new URLSearchParams(searchParams);

    const localToday = getLocalToday();

    next.set("date", localToday);
    setSearchParams(next, { replace: true });
  }

  function goToPrevious() {
    const nextDate = new Date(selectedDate);
    if (view === "month") nextDate.setMonth(nextDate.getMonth() - 1);
    if (view === "week") nextDate.setDate(nextDate.getDate() - 7);
    if (view === "day") nextDate.setDate(nextDate.getDate() - 1);
    const next = new URLSearchParams(searchParams);
    next.set("date", formatDateKey(nextDate));
    setSearchParams(next, { replace: true });
  }

  function goToNext() {
    const nextDate = new Date(selectedDate);
    if (view === "month") nextDate.setMonth(nextDate.getMonth() + 1);
    if (view === "week") nextDate.setDate(nextDate.getDate() + 7);
    if (view === "day") nextDate.setDate(nextDate.getDate() + 1);

    // prevent navigating past today
    if (formatDateKey(nextDate) > localToday) return;

    const next = new URLSearchParams(searchParams);
    next.set("date", formatDateKey(nextDate));
    setSearchParams(next, { replace: true });
  }

  const localToday = getLocalToday();
  const isToday = currentDate === localToday;

  const weekStart = addDays(selectedDate, -selectedDate.getDay());
  const weekEnd = addDays(weekStart, 6);

  const headerLabel =
    view === "day"
      ? isToday
        ? "Today"
        : selectedDate.toLocaleDateString("en-CA", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })
      : view === "week"
        ? `${weekStart.toLocaleDateString("en-CA", {
            month: "long",
            day: "numeric",
          })} – ${
            weekStart.getMonth() === weekEnd.getMonth()
              ? weekEnd.getDate()
              : weekEnd.toLocaleDateString("en-CA", {
                  month: "long",
                  day: "numeric",
                })
          }, ${weekEnd.getFullYear()}`
        : selectedDate.toLocaleDateString("en-CA", {
            month: "long",
            year: "numeric",
          });

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              View meals and macro trends by month, week, or day.
            </p>
          </div>

          <Link
            to="/home"
            className="rounded border bg-card px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={goToPrevious}
              className="rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Previous
            </button>

            <button
              onClick={goToToday}
              className="rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Today
            </button>

            <button
              onClick={goToNext}
              disabled={
                isToday || formatDateKey(addDays(selectedDate, 1)) > localToday
              }
              className="rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>

          <h2 className="text-lg font-semibold">{headerLabel}</h2>

          <div className="flex w-fit rounded-xl border bg-muted/50 p-1">
            <ViewTab current={view} value="month" onChange={setView} />
            <ViewTab current={view} value="week" onChange={setView} />
            <ViewTab current={view} value="day" onChange={setView} />
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <main className="rounded-2xl border bg-card p-5 shadow-sm">
          {view === "month" ? (
            <div className="space-y-6">
              <MonthView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                logsByDate={logsByDate}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <CaloriesLineChart
                  title="Monthly Calorie Trends"
                  description="Daily calorie totals for the selected month."
                  data={monthChartData}
                  xTickFormatter={(value) => String(value)}
                />
                <MacroLineChart
                  title="Monthly Macro Trends"
                  description="Daily protein, carbs, and fat totals for the selected month."
                  data={monthChartData}
                  xTickFormatter={(value) => String(value)}
                />
                <div className="lg:col-span-2 flex justify-center">
                  <div className="w-full lg:w-1/2">
                    <WaterLineChart
                      title="Monthly Water Trends"
                      description="Daily water intake (ml) for the selected month."
                      data={monthChartData}
                      xTickFormatter={(value) => String(value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {view === "week" ? (
            <div className="space-y-6">
              <WeekView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                logsByDate={logsByDate}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <CaloriesLineChart
                  title="Weekly Calorie Trends"
                  description="Daily calorie totals for the selected week."
                  data={weekChartData}
                  xTickFormatter={(value) => String(value).slice(0, 3)}
                />
                <MacroLineChart
                  title="Weekly Macro Trends"
                  description="Daily protein, carbs, and fat totals for the selected week."
                  data={weekChartData}
                  xTickFormatter={(value) => String(value).slice(0, 3)}
                />
                <div className="lg:col-span-2 flex justify-center">
                  <div className="w-full lg:w-1/2">
                    <WaterLineChart
                      title="Weekly Water Trends"
                      description="Daily water intake (ml) for the selected week."
                      data={weekChartData}
                      xTickFormatter={(value) => String(value).slice(0, 3)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {view === "day" ? (
            <DayView
              selectedDate={selectedDate}
              logs={selectedDayLogs}
              progress={progress}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function ViewTab({
  current,
  value,
  onChange,
}: {
  current: ViewMode;
  value: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  const active = current === value;

  return (
    <button
      onClick={() => onChange(value)}
      className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {value}
    </button>
  );
}

function MonthView({
  selectedDate,
  onSelectDate,
  logsByDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  logsByDate: Record<string, MealLog[]>;
}) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="rounded-lg bg-muted/50 py-2 text-center text-sm font-semibold text-muted-foreground transition-colors"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((date, index) => {
          const isSelected = date ? sameDay(date, selectedDate) : false;
          const dayKey = date ? formatDateKey(date) : "";
          const dayLogs = date ? (logsByDate[dayKey] ?? []) : [];
          const hasLogs = dayLogs.length > 0;
          const hoverPreview = getHoverPreview(dayLogs);

          return (
            <button
              key={index}
              onClick={() => date && onSelectDate(date)}
              title={
                hasLogs
                  ? hoverPreview
                      .map(
                        (group) =>
                          `${group.mealType}: ${group.logs.map((log) => getMealSummary(log)).join(", ")}`,
                      )
                      .join("\n")
                  : "No meals logged"
              }
              className={`group relative min-h-[100px] rounded-xl border p-3 text-left transition-colors ${
                date
                  ? isSelected
                    ? "border-primary bg-accent/50 ring-1 ring-primary/20"
                    : "bg-card hover:bg-accent/30"
                  : "border-dashed bg-muted/20 opacity-50"
              }`}
            >
              {date ? (
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {date.getDate()}
                    </span>
                    {hasLogs ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    ) : null}
                  </div>
                  <span className="text-xs text-gray-400">
                    {hasLogs ? "Meals logged" : "No meals"}
                  </span>
                  {hasLogs ? (
                    <div className="pointer-events-none absolute left-2 top-full z-20 hidden w-64 rounded-lg border bg-card p-3 text-xs shadow-lg group-hover:block">
                      <p className="mb-2 font-semibold text-foreground">
                        Meals logged
                      </p>
                      <div className="space-y-2 text-muted-foreground">
                        {hoverPreview.map((group) => (
                          <div key={group.mealType}>
                            <p className="font-medium text-foreground">
                              {group.mealType}
                            </p>
                            <div className="space-y-1">
                              {group.logs.map((log) => (
                                <p key={log.id}>{getMealSummary(log)}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  selectedDate,
  onSelectDate,
  logsByDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  logsByDate: Record<string, MealLog[]>;
}) {
  const start = new Date(selectedDate);
  start.setDate(selectedDate.getDate() - selectedDate.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <div className="grid gap-4 md:grid-cols-7">
      {days.map((day) => {
        const isSelected = sameDay(day, selectedDate);
        const dayLogs = logsByDate[formatDateKey(day)] ?? [];
        const hasLogs = dayLogs.length > 0;
        const hoverPreview = getHoverPreview(dayLogs);

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            title={
              hasLogs
                ? hoverPreview
                    .map(
                      (group) =>
                        `${group.mealType}: ${group.logs.map((log) => getMealSummary(log)).join(", ")}`,
                    )
                    .join("\n")
                : "No meals logged"
            }
            className={`group relative rounded-xl border p-4 text-left transition-colors ${
              isSelected
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card hover:bg-accent/50 text-card-foreground"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {day.toLocaleDateString("en-CA", { weekday: "short" })}
              </p>
              {hasLogs ? (
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              ) : null}
            </div>

            <p className="text-lg font-bold">{day.getDate()}</p>
            <div className="mt-4 text-xs text-gray-400">
              {hasLogs ? "Meals logged" : "No meals"}
            </div>
            {hasLogs ? (
              <div className="pointer-events-none absolute left-2 top-full z-20 hidden w-64 rounded-lg border bg-card p-3 text-xs shadow-lg group-hover:block">
                <p className="mb-2 font-semibold text-foreground">
                  Meals logged
                </p>
                <div className="space-y-2 text-muted-foreground">
                  {hoverPreview.map((group) => (
                    <div key={group.mealType}>
                      <p className="font-medium text-foreground">
                        {group.mealType}
                      </p>
                      <div className="space-y-1">
                        {group.logs.map((log) => (
                          <p key={log.id}>{getMealSummary(log)}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function DayView({
  selectedDate,
  logs,
  progress = {
    current: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, water: 0 },
    goal: {
      calories: 2000,
      protein: 150,
      carbohydrates: 250,
      fat: 70,
      water: 0,
    },
  },
}: {
  selectedDate: Date;
  logs: MealLog[];
  progress?: DailyProgress;
}) {
  const groupedLogs = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map((type) => ({
    type,
    logs: logs.filter((log) => log.meal_name === type),
  }));

  const caloriesConfig = {
    calories: {
      label: "Calories",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const consumed = progress.current.calories;
  const goal = progress.goal.calories;

  const currentDate = selectedDate.toLocaleDateString("en-CA");
  const remainingValue = Math.max(
    0,
    progress.goal.calories - progress.current.calories,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card text-card-foreground p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              {selectedDate.toLocaleDateString("en-CA", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Meals and progress for this day.
            </p>
          </div>

          <Link
            to={`/analytics/logging?date=${formatDateKey(selectedDate)}#saved-meal-logs`}
            className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Edit Meals
          </Link>
        </div>
      </div>

      {progress ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* These components should already have bg-card inside them, 
            but if they look weird, check their internal container classes too */}
          <CaloriesStat
            title="Consumed"
            current={consumed}
            goal={goal}
            color={consumed > goal ? "var(--chart-1)" : "var(--chart-2)"}
          />
          <CaloriesStat
            title="Remaining"
            current={remainingValue}
            goal={goal}
            color="var(--chart-5)"
          />
          <WaterStat
            title="Water"
            current={progress.current.water}
            goal={progress.goal.water}
          />

          {/* MacroStats often needs a full-width col-span on mobile */}
          <div className="md:col-span-3">
            <MacroStats
              title="Macro Nutrients"
              data={{
                carbs: {
                  current: progress.current.carbohydrates,
                  goal: progress.goal.carbohydrates,
                },
                fat: {
                  current: progress.current.fat,
                  goal: progress.goal.fat,
                },
                protein: {
                  current: progress.current.protein,
                  goal: progress.goal.protein,
                },
              }}
            />
          </div>
        </div>
      ) : null}

      <section className="w-full rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <SavedLogs logs={logs} currentDate={currentDate} />
      </section>
    </div>
  );
}

function CaloriesLineChart({
  title,
  description,
  data,
  xTickFormatter,
}: {
  title: string;
  description: string;
  data: MacroPoint[];
  xTickFormatter: (value: string) => string;
}) {
  const chartConfig = {
    calories: { label: "Calories", color: "#ec4899" },
  } satisfies ChartConfig;

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-4">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={xTickFormatter}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="calories"
              type="monotone"
              stroke="#ec4899"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function MacroLineChart({
  title,
  description,
  data,
  xTickFormatter,
}: {
  title: string;
  description: string;
  data: MacroPoint[];
  xTickFormatter: (value: string) => string;
}) {
  const chartConfig = {
    protein: { label: "Protein", color: "var(--chart-2)" },
    carbohydrates: { label: "Carbs", color: "var(--chart-3)" },
    fat: { label: "Fat", color: "var(--chart-4)" },
  } satisfies ChartConfig;

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-4">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={xTickFormatter}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="protein"
              type="monotone"
              stroke="var(--color-protein)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="carbohydrates"
              type="monotone"
              stroke="var(--color-carbohydrates)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="fat"
              type="monotone"
              stroke="var(--color-fat)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function WaterLineChart({
  title,
  description,
  data,
  xTickFormatter,
}: {
  title: string;
  description: string;
  data: any[];
  xTickFormatter: (value: string) => string;
}) {
  const chartConfig = {
    water: { label: "Water (ml)", color: "#3b82f6" },
  } satisfies ChartConfig;

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-4">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={xTickFormatter}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="water"
              type="monotone"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
