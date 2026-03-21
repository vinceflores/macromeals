import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { data, Link, redirect, useLoaderData, useSearchParams } from "react-router"

import { CaloriesStat, MacroStats, WaterStat } from "components/charts/macro-stats"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart"
import type { Route } from "./+types/calendar"
import { getSession } from "~/sessions.server"
import { Fetch } from "~/lib/auth.server"

type ViewMode = "month" | "week" | "day"

type MealLogIngredient = {
  name: string
  quantity: number
  unit: string
}

type MealLog = {
  id: number
  meal_name: string
  description: string
  ingredients: MealLogIngredient[]
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  created_at: string
  date_logged?: string
}

type DailyProgress = {
  current: {
    calories: number
    fat: number
    protein: number
    carbohydrates: number
    water: number
  }
  goal: {
    calories: number
    fat: number
    protein: number
    carbohydrates: number
    water: number
  }
}

type MacroPoint = {
  key: string
  label: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
}

function formatDateKey(date: Date) {
  return date.toLocaleDateString("en-CA")
}

function parseDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`)
}

function sameDay(a: Date, b: Date) {
  return formatDateKey(a) === formatDateKey(b)
}

function getLogDate(log: MealLog) {
  return (log.date_logged || log.created_at || "").split("T")[0]
}

function addDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate)
  nextDate.setDate(baseDate.getDate() + days)
  return nextDate
}

function getDailyTotals(logs: MealLog[]) {
  return logs.reduce(
    (acc, log) => {
      acc.calories += Number(log.calories || 0)
      acc.protein += Number(log.protein || 0)
      acc.carbohydrates += Number(log.carbohydrates || 0)
      acc.fat += Number(log.fat || 0)
      return acc
    },
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
  )
}

function groupLogsByDate(logs: MealLog[]) {
  return logs.reduce<Record<string, MealLog[]>>((acc, log) => {
    const key = getLogDate(log)
    if (!key) return acc
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})
}

function getWeekChartData(selectedDate: Date, logsByDate: Record<string, MealLog[]>) {
  const start = addDays(selectedDate, -selectedDate.getDay())

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    const key = formatDateKey(date)
    const totals = getDailyTotals(logsByDate[key] ?? [])

    return {
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      ...totals,
    }
  })
}

function getMonthChartData(selectedDate: Date, logsByDate: Record<string, MealLog[]>) {
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1)
    const key = formatDateKey(date)
    const totals = getDailyTotals(logsByDate[key] ?? [])

    return {
      key,
      label: String(index + 1),
      ...totals,
    }
  })
}

function getMealSummary(log: MealLog) {
  if (log.ingredients?.length) {
    return log.ingredients
      .slice(0, 3)
      .map((ingredient) => `${ingredient.name} (${ingredient.quantity}${ingredient.unit})`)
      .join(", ")
  }

  return log.description?.trim() || "No meal details saved."
}

function getHoverPreview(logs: MealLog[]) {
  const mealGroups = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const

  return mealGroups
    .map((mealType) => ({
      mealType,
      logs: logs.filter((log) => log.meal_name === mealType),
    }))
    .filter((group) => group.logs.length > 0)
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Calendar | MacroMeals" },
    {
      name: "description",
      content: "View meals and macro trends by month, week, or day.",
    },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"))

  if (!session.data.access) {
    return redirect("/auth/login")
  }

  const url = new URL(request.url)
  const currentDate = url.searchParams.get("date") || formatDateKey(new Date())

  try {
    const [allLogsRes, selectedDayLogsRes, progressRes] = await Promise.all([
      Fetch(new Request(`${process.env.SERVER_URL}/api/logging/`), session),
      Fetch(new Request(`${process.env.SERVER_URL}/api/logging/?date=${currentDate}`), session),
      Fetch(new Request(`${process.env.SERVER_URL}/api/analytics/progress/?date=${currentDate}`), session),
    ])

    const allLogsBody = await allLogsRes.json()
    const selectedDayLogsBody = await selectedDayLogsRes.json()
    const progress = (await progressRes.json()) as DailyProgress

    return data({
      allLogs: (allLogsBody.results ?? []) as MealLog[],
      selectedDayLogs: (selectedDayLogsBody.results ?? []) as MealLog[],
      progress,
      currentDate,
      error: undefined as string | undefined,
    })
  } catch (error) {
    return data({
      allLogs: [] as MealLog[],
      selectedDayLogs: [] as MealLog[],
      progress: undefined as DailyProgress | undefined,
      currentDate,
      error: String(error),
    })
  }
}

export default function CalendarPage() {
  const { allLogs, selectedDayLogs, progress, currentDate, error } =
    useLoaderData<typeof loader>()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedDate = parseDate(currentDate)
  const view = (searchParams.get("view") as ViewMode) || "month"
  const logsByDate = groupLogsByDate(allLogs)

  const weekChartData = getWeekChartData(selectedDate, logsByDate)
  const monthChartData = getMonthChartData(selectedDate, logsByDate)

  function setView(nextView: ViewMode) {
    const next = new URLSearchParams(searchParams)
    next.set("view", nextView)
    setSearchParams(next, { replace: true })
  }

  function setSelectedDate(date: Date) {
    const next = new URLSearchParams(searchParams)
    next.set("date", formatDateKey(date))
    if (view !== "day") next.set("view", "day")
    setSearchParams(next, { replace: true })
  }

  function goToToday() {
    const next = new URLSearchParams(searchParams)
    next.set("date", formatDateKey(new Date()))
    setSearchParams(next, { replace: true })
  }

  function goToPrevious() {
    const nextDate = new Date(selectedDate)
    if (view === "month") nextDate.setMonth(nextDate.getMonth() - 1)
    if (view === "week") nextDate.setDate(nextDate.getDate() - 7)
    if (view === "day") nextDate.setDate(nextDate.getDate() - 1)
    const next = new URLSearchParams(searchParams)
    next.set("date", formatDateKey(nextDate))
    setSearchParams(next, { replace: true })
  }

  function goToNext() {
    const nextDate = new Date(selectedDate)
    if (view === "month") nextDate.setMonth(nextDate.getMonth() + 1)
    if (view === "week") nextDate.setDate(nextDate.getDate() + 7)
    if (view === "day") nextDate.setDate(nextDate.getDate() + 1)
    const next = new URLSearchParams(searchParams)
    next.set("date", formatDateKey(nextDate))
    setSearchParams(next, { replace: true })
  }

  const headerLabel = selectedDate.toLocaleDateString("en-CA", {
    weekday: view === "day" ? "long" : undefined,
    year: "numeric",
    month: "long",
    day: view === "day" ? "numeric" : undefined,
  })

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              View meals and macro trends by month, week, or day.
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
              </div>
            </div>
          ) : null}

          {view === "day" ? (
            <DayView selectedDate={selectedDate} logs={selectedDayLogs} progress={progress} />
          ) : null}
        </main>
      </div>
    </div>
  )
}

function ViewTab({
  current,
  value,
  onChange,
}: {
  current: ViewMode
  value: ViewMode
  onChange: (view: ViewMode) => void
}) {
  const active = current === value

  return (
    <button
      onClick={() => onChange(value)}
      className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
        active ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {value}
    </button>
  )
}

function MonthView({
  selectedDate,
  onSelectDate,
  logsByDate,
}: {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  logsByDate: Record<string, MealLog[]>
}) {
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const startDay = firstDayOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: Array<Date | null> = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day))
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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
          const isSelected = date ? sameDay(date, selectedDate) : false
          const dayKey = date ? formatDateKey(date) : ""
          const dayLogs = date ? logsByDate[dayKey] ?? [] : []
          const hasLogs = dayLogs.length > 0
          const hoverPreview = getHoverPreview(dayLogs)

          return (
            <button
              key={index}
              onClick={() => date && onSelectDate(date)}
              title={
                hasLogs
                  ? hoverPreview
                      .map((group) =>
                        `${group.mealType}: ${group.logs.map((log) => getMealSummary(log)).join(", ")}`
                      )
                      .join("\n")
                  : "No meals logged"
              }
              className={`group relative min-h-[100px] rounded-xl border p-3 text-left transition ${
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
                    {hasLogs ? <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> : null}
                  </div>
                  <span className="text-xs text-gray-400">
                    {hasLogs ? "Meals logged" : "No meals"}
                  </span>
                  {hasLogs ? (
                    <div className="pointer-events-none absolute left-2 top-full z-20 hidden w-64 rounded-lg border bg-white p-3 text-xs shadow-lg group-hover:block">
                      <p className="mb-2 font-semibold text-foreground">Meals logged</p>
                      <div className="space-y-2 text-muted-foreground">
                        {hoverPreview.map((group) => (
                          <div key={group.mealType}>
                            <p className="font-medium text-foreground">{group.mealType}</p>
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
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  selectedDate,
  onSelectDate,
  logsByDate,
}: {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  logsByDate: Record<string, MealLog[]>
}) {
  const start = new Date(selectedDate)
  start.setDate(selectedDate.getDate() - selectedDate.getDay())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  return (
    <div className="grid gap-4 md:grid-cols-7">
      {days.map((day) => {
        const isSelected = sameDay(day, selectedDate)
        const dayLogs = logsByDate[formatDateKey(day)] ?? []
        const hasLogs = dayLogs.length > 0
        const hoverPreview = getHoverPreview(dayLogs)

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            title={
              hasLogs
                ? hoverPreview
                    .map((group) =>
                      `${group.mealType}: ${group.logs.map((log) => getMealSummary(log)).join(", ")}`
                    )
                    .join("\n")
                : "No meals logged"
            }
            className={`group relative rounded-xl border p-4 text-left transition ${
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
            {hasLogs ? (
              <div className="pointer-events-none absolute left-2 top-full z-20 hidden w-64 rounded-lg border bg-white p-3 text-xs shadow-lg group-hover:block">
                <p className="mb-2 font-semibold text-foreground">Meals logged</p>
                <div className="space-y-2 text-muted-foreground">
                  {hoverPreview.map((group) => (
                    <div key={group.mealType}>
                      <p className="font-medium text-foreground">{group.mealType}</p>
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
        )
      })}
    </div>
  )
}

function DayView({
  selectedDate,
  logs,
  progress,
}: {
  selectedDate: Date
  logs: MealLog[]
  progress?: DailyProgress
}) {
  const groupedLogs = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map((type) => ({
    type,
    logs: logs.filter((log) => log.meal_name === type),
  }))

  const caloriesConfig = {
    calories: {
      label: "Calories",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
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
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Edit Meals
          </Link>
        </div>
      </div>

      {progress ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <CaloriesStat
            chartConfig={caloriesConfig}
            title="calories"
            chartData={[
              {
                calories: progress.current.calories,
                current: progress.current.calories,
                goal: progress.goal.calories,
                unit: "kcal",
                fill:
                  progress.goal.calories > progress.current.calories
                    ? "var(--chart-2)"
                    : "var(--chart-1)",
              },
            ]}
          />
          <WaterStat
            title="water"
            current={progress.current.water}
            goal={progress.goal.water}
          />
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
      ) : null}

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
                    <p className="mt-1 text-sm text-muted-foreground">{getMealSummary(log)}</p>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
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
    </div>
  )
}

function CaloriesLineChart({
  title,
  description,
  data,
  xTickFormatter,
}: {
  title: string
  description: string
  data: MacroPoint[]
  xTickFormatter: (value: string) => string
}) {
  const chartConfig = {
    calories: { label: "Calories", color: "var(--chart-1)" },
  } satisfies ChartConfig

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
              stroke="var(--color-calories)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  )
}

function MacroLineChart({
  title,
  description,
  data,
  xTickFormatter,
}: {
  title: string
  description: string
  data: MacroPoint[]
  xTickFormatter: (value: string) => string
}) {
  const chartConfig = {
    protein: { label: "Protein", color: "var(--chart-2)" },
    carbohydrates: { label: "Carbs", color: "var(--chart-3)" },
    fat: { label: "Fat", color: "var(--chart-4)" },
  } satisfies ChartConfig

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
  )
}
