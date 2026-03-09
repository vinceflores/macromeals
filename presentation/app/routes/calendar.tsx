import { useMemo, useState } from "react";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/calendar";
import { getSession } from "~/sessions.server";

type ViewMode = "month" | "week" | "day";

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

  return null;
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formattedHeader = useMemo(() => {
    return selectedDate.toLocaleDateString("en-CA", {
      weekday: view === "day" ? "long" : undefined,
      year: "numeric",
      month: "long",
      day: view === "day" ? "numeric" : undefined,
    });
  }, [selectedDate, view]);

  function goToToday() {
    setSelectedDate(new Date());
  }

  function goToPrevious() {
    const next = new Date(selectedDate);
    if (view === "month") next.setMonth(next.getMonth() - 1);
    if (view === "week") next.setDate(next.getDate() - 7);
    if (view === "day") next.setDate(next.getDate() - 1);
    setSelectedDate(next);
  }

  function goToNext() {
    const next = new Date(selectedDate);
    if (view === "month") next.setMonth(next.getMonth() + 1);
    if (view === "week") next.setDate(next.getDate() + 7);
    if (view === "day") next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meal Calendar</h1>
            <p className="text-sm text-muted-foreground">
              Skeleton view for month, week, and day tracking.
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

          <h2 className="text-lg font-semibold">{formattedHeader}</h2>

          <div className="flex w-fit rounded-xl border p-1">
            <ViewTab current={view} value="month" onChange={setView} />
            <ViewTab current={view} value="week" onChange={setView} />
            <ViewTab current={view} value="day" onChange={setView} />
          </div>
        </section>

        <main className="rounded-2xl border bg-white p-5 shadow-sm">
          {view === "month" && (
            <MonthView
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}

          {view === "week" && (
            <WeekSection
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}

          {view === "day" && <DayView selectedDate={selectedDate} />}
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
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [];

  for (let i = 0; i < startDay; i++) {
    cells.push(null);
  }

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
          const isSelected =
            date && date.toDateString() === selectedDate.toDateString();

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
                  <span className="text-sm font-medium">{date.getDate()}</span>
                  <span className="text-xs text-gray-400">Meals go here</span>
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
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  return (
    <div className="space-y-6">
      <WeekView selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <DayView selectedDate={selectedDate} />
    </div>
  );
}

function WeekView({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
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
        const isSelected = day.toDateString() === selectedDate.toDateString();

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            className={`rounded-xl border p-4 text-left transition ${
              isSelected ? "border-black bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            <p className="text-sm font-semibold">
              {day.toLocaleDateString("en-CA", { weekday: "short" })}
            </p>
            <p className="text-lg font-bold">{day.getDate()}</p>
            <div className="mt-4 text-xs text-gray-400">Meals go here</div>
          </button>
        );
      })}
    </div>
  );
}

function DayView({ selectedDate }: { selectedDate: Date }) {
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
          Daily meals and totals will go here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h4 className="font-semibold">Meals</h4>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="rounded-lg bg-gray-50 p-3">Breakfast placeholder</div>
            <div className="rounded-lg bg-gray-50 p-3">Lunch placeholder</div>
            <div className="rounded-lg bg-gray-50 p-3">Dinner placeholder</div>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <h4 className="font-semibold">Daily Totals</h4>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <MetricCard label="Calories" value="0" />
            <MetricCard label="Protein" value="0g" />
            <MetricCard label="Carbs" value="0g" />
            <MetricCard label="Fat" value="0g" />
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