import { data, Link, redirect, useLoaderData, useSearchParams } from "react-router";
import type { Route } from "./+types/calendar";
import { getSession } from "~/sessions.server";
import { Fetch } from "~/lib/auth.server";

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

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
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

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Calendar | MacroMeals" },
    {
      name: "description",
      content: "View meals by month, week, or day.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.data.access) {
    return redirect("/auth/login");
  }

  const url = new URL(request.url);
  const currentDate = url.searchParams.get("date") || formatDateKey(new Date());

  try {
    const [allLogsRes, selectedDayLogsRes] = await Promise.all([
      Fetch(new Request(`${process.env.SERVER_URL}/api/logging/`), session),
      Fetch(
        new Request(`${process.env.SERVER_URL}/api/logging/?date=${currentDate}`),
        session,
      ),
    ]);

    const allLogsBody = await allLogsRes.json();
    const selectedDayLogsBody = await selectedDayLogsRes.json();

    return data({
      allLogs: (allLogsBody.results ?? []) as MealLog[],
      selectedDayLogs: (selectedDayLogsBody.results ?? []) as MealLog[],
      currentDate,
      error: undefined as string | undefined,
    });
  } catch (error) {
    return data({
      allLogs: [] as MealLog[],
      selectedDayLogs: [] as MealLog[],
      currentDate,
      error: String(error),
    });
  }
}

export default function CalendarPage() {
  const { allLogs, selectedDayLogs, currentDate, error } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedDate = parseDate(currentDate);
  const view = (searchParams.get("view") as ViewMode) || "month";

  const logDates = new Set(allLogs.map((log) => getLogDate(log)));

  const totals = selectedDayLogs.reduce(
    (acc, log) => {
      acc.calories += Number(log.calories || 0);
      acc.protein += Number(log.protein || 0);
      acc.carbohydrates += Number(log.carbohydrates || 0);
      acc.fat += Number(log.fat || 0);
      return acc;
    },
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
  );

  function setView(nextView: ViewMode) {
    const next = new URLSearchParams(searchParams);
    next.set("view", nextView);
    setSearchParams(next, { replace: true });
  }

  function setSelectedDate(date: Date) {
    const next = new URLSearchParams(searchParams);
    next.set("date", formatDateKey(date));
    setSearchParams(next, { replace: true });
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  function goToPrevious() {
    const nextDate = new Date(selectedDate);
    if (view === "month") nextDate.setMonth(nextDate.getMonth() - 1);
    if (view === "week") nextDate.setDate(nextDate.getDate() - 7);
    if (view === "day") nextDate.setDate(nextDate.getDate() - 1);
    setSelectedDate(nextDate);
  }

  function goToNext() {
    const nextDate = new Date(selectedDate);
    if (view === "month") nextDate.setMonth(nextDate.getMonth() + 1);
    if (view === "week") nextDate.setDate(nextDate.getDate() + 7);
    if (view === "day") nextDate.setDate(nextDate.getDate() + 1);
    setSelectedDate(nextDate);
  }

  const headerLabel = selectedDate.toLocaleDateString("en-CA", {
    weekday: view === "day" ? "long" : undefined,
    year: "numeric",
    month: "long",
    day: view === "day" ? "numeric" : undefined,
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meal Calendar</h1>
            <p className="text-sm text-muted-foreground">
              View your logged meals by month, week, or day.
            </p>
          </div>

          <Link
            to="/"
            className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={goToPrevious}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Previous
            </button>

            <button
              onClick={goToToday}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Today
            </button>

            <button
              onClick={goToNext}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Next
            </button>
          </div>

          <h2 className="text-lg font-semibold">{headerLabel}</h2>

          <div className="flex w-fit rounded-xl border p-1">
            <ViewTab current={view} value="month" onChange={setView} />
            <ViewTab current={view} value="week" onChange={setView} />
            <ViewTab current={view} value="day" onChange={setView} />
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <main className="rounded-2xl border bg-white p-5 shadow-sm">
          {view === "month" && (
            <MonthView
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              logDates={logDates}
            />
          )}

          {view === "week" && (
            <WeekSection
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              logDates={logDates}
              logs={selectedDayLogs}
              totals={totals}
            />
          )}

          {view === "day" && (
            <DayView selectedDate={selectedDate} logs={selectedDayLogs} totals={totals} />
          )}
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
      className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
        active ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {value}
    </button>
  );
}

function MonthView({
  selectedDate,
  onSelectDate,
  logDates,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  logDates: Set<string>;
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
            className="rounded-lg bg-gray-50 py-2 text-center text-sm font-semibold text-gray-600"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((date, index) => {
          const isSelected = date ? sameDay(date, selectedDate) : false;
          const hasLogs = date ? logDates.has(formatDateKey(date)) : false;

          return (
            <button
              key={index}
              onClick={() => date && onSelectDate(date)}
              className={`min-h-[100px] rounded-xl border p-3 text-left transition ${
                date
                  ? isSelected
                    ? "border-black bg-gray-100"
                    : "hover:bg-gray-50"
                  : "border-dashed bg-gray-50/50"
              }`}
            >
              {date ? (
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{date.getDate()}</span>
                    {hasLogs ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    ) : null}
                  </div>
                  <span className="text-xs text-gray-400">
                    {hasLogs ? "Meals logged" : "No meals"}
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekSection({
  selectedDate,
  onSelectDate,
  logDates,
  logs,
  totals,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  logDates: Set<string>;
  logs: MealLog[];
  totals: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  };
}) {
  return (
    <div className="space-y-6">
      <WeekView
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        logDates={logDates}
      />
      <DayView selectedDate={selectedDate} logs={logs} totals={totals} />
    </div>
  );
}

function WeekView({
  selectedDate,
  onSelectDate,
  logDates,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  logDates: Set<string>;
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
        const hasLogs = logDates.has(formatDateKey(day));

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            className={`rounded-xl border p-4 text-left transition ${
              isSelected ? "border-black bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {day.toLocaleDateString("en-CA", { weekday: "short" })}
              </p>
              {hasLogs ? <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> : null}
            </div>

            <p className="text-lg font-bold">{day.getDate()}</p>
            <div className="mt-4 text-xs text-gray-400">
              {hasLogs ? "Meals logged" : "No meals"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DayView({
  selectedDate,
  logs,
  totals,
}: {
  selectedDate: Date;
  logs: MealLog[];
  totals: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  };
}) {
  const groupedLogs = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map((type) => ({
    type,
    logs: logs.filter((log) => log.meal_name === type),
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4">
        <h3 className="text-lg font-semibold">
          {selectedDate.toLocaleDateString("en-CA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Meals logged for this day.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h4 className="font-semibold">Meals</h4>

          <div className="mt-3 space-y-4">
            {groupedLogs.map(({ type, logs: typeLogs }) => (
              <div key={type} className="space-y-2">
                <h5 className="border-b pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {type}
                </h5>

                {typeLogs.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">
                    No {type.toLowerCase()} logged.
                  </p>
                ) : (
                  typeLogs.map((log) => (
                    <div key={log.id} className="rounded-lg bg-gray-50 p-3">
                      <p className="font-medium">{log.calories} kcal</p>
                      <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                        <span>P: {log.protein}g</span>
                        <span>C: {log.carbohydrates}g</span>
                        <span>F: {log.fat}g</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <h4 className="font-semibold">Daily Totals</h4>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <MetricCard label="Calories" value={String(Number(totals.calories.toFixed(2)))} />
            <MetricCard label="Protein" value={`${Number(totals.protein.toFixed(2))}g`} />
            <MetricCard
              label="Carbs"
              value={`${Number(totals.carbohydrates.toFixed(2))}g`}
            />
            <MetricCard label="Fat" value={`${Number(totals.fat.toFixed(2))}g`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}