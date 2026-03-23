"use client"

import { TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    Label,
    LabelList,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart,
    XAxis,
    YAxis,
} from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "~/components/ui/card"
import {
    ChartContainer,
    type ChartConfig,
} from "~/components/ui/chart"

const DEFAULT_CALORIES_CONFIG = {
    calories: {label: "calories", color: "var(--chart-2)"},
} satisfies ChartConfig


export const description = "A radial chart with text"

// const chartData = [
//     { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
// ]

export type ProgressStatProps = {
    chartConfig: ChartConfig
    chartData: {
        calories: number
        current: number
        goal: number
        unit: string // 'g' | 'kcals'
        fill: string
    }[]
    title: string,
}

export function CaloriesStat({ 
    title, 
    current, 
    goal, 
    unit = "kcal", 
    color = "var(--chart-2)" 
}: {
    title: string,
    current: number,
    goal: number,
    unit?: string,
    color?: string
}) {
    const [angles, setAngles] = useState({
        startAngle: 90,
        endAngle: 90,
    })

    const chartData = [{
        calories: current,
        current: current,
        goal: goal,
        unit: unit,
        fill: color
    }];

    const data = chartData[0];

    useEffect(() => {
        const startAngle = 90
        const endAngle = 90 - 360 * (data.current / data.goal)
        setAngles({ startAngle, endAngle })
    }, [data.goal, data.current])

    return (
        <Card className="flex flex-1 flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle className="capitalize">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pb-0">
                <ChartContainer
                    config={DEFAULT_CALORIES_CONFIG}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <RadialBarChart
                        data={chartData}
                        startAngle={angles.startAngle}
                        endAngle={angles.endAngle}
                        innerRadius={80}
                        outerRadius={110}
                    >
                        <PolarGrid
                            gridType="circle"
                            radialLines={false}
                            stroke="none"
                            className="first:fill-muted last:fill-background"
                            polarRadius={[86, 74]}
                        />
                        <RadialBar dataKey="current" background cornerRadius={10} />
                        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                            <Label
                            content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                const isRemainingChart = title.toLowerCase() === "remaining";
                                const isOverGoal = data.current > data.goal;
                                
                                let displayValue;
                                if (isRemainingChart) {
                                    displayValue = Math.round(data.current); 
                                } else {
                                    
                                    displayValue = isOverGoal ? Math.round(data.current - data.goal) : Math.round(data.current);
                                }

                                return (
                                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                    <tspan
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        className="fill-foreground text-4xl font-bold tracking-tighter"
                                    >
                                        {displayValue}
                                    </tspan>
                                    <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 24}
                                        className="fill-muted-foreground text-xs uppercase font-medium"
                                    >
                                        {/* Change label to "Surplus" if they overshot the consumed goal */}
                                        {!isRemainingChart && isOverGoal ? "Surplus kcal" : data.unit}
                                    </tspan>
                                    </text>
                                );
                                }
                            }}
                            />
                        </PolarRadiusAxis>
                    </RadialBarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 leading-none font-medium text-muted-foreground">
                    {data.goal > data.current ? "Out of" : "Over"} {data.goal} {data.unit}
                </div>
            </CardFooter>
        </Card>
    )
}

type WaterStatProps = {
    title: string,
    current: number,
    goal: number
}

export function WaterStat(props: WaterStatProps) {
    const chartConfig = {
        water: {
            label: "water",
            color: "var(--chart-3)",
        }
    } satisfies ChartConfig
    const chartData = [{
        xlabel: "in ml",
        water: props.current
    }]
    return (
        <Card className="col-start-3">
            <CardHeader className="items-center pb-0">
                <CardTitle className="capitalize">{props.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col-reverse h-full">
                <ChartContainer className="h-full" config={chartConfig}>
                    <BarChart accessibilityLayer data={chartData} >
                        <CartesianGrid vertical={false} />
                        <YAxis
                            type="number"
                            orientation="right"
                            tickLine={true}
                            tickMargin={10}
                            axisLine={true}
                            domain={[0, props.goal]}
                            className=""
                        />
                    
                        <Bar dataKey="water" fill="#99CFFF" radius={8} >
                            <LabelList
                                dataKey="water"
                                position="center"
                                fill="#000"
                                fontSize={14}
                                formatter={(value: number) => value != 0? `${value} ml` : ""}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

type Goal = {
    current: number
    goal: number
}
type MacroStatsProps = {
    title: string
    data: {
        carbs: Goal,
        fat: Goal,
        protein: Goal,
    }
}
export function MacroStats(props: MacroStatsProps) {
    const chartConfig = {
        water: {
            label: "water",
            color: "var(--chart-3)",
        }
    } satisfies ChartConfig
    const chartData = [
        {
            label: "carb",
            current: props.data.carbs.current,
            current_norm: (props.data.carbs.current / props.data.carbs.goal) * 100,
            goal: props.data.carbs.goal, unit: "g", fill: "var(--chart-2)"
        },
        {
            label: "fat",
            current_norm: props.data.fat.current,
            current: (props.data.fat.current / props.data.fat.goal) * 1100,
            goal: props.data.fat.goal,
            // ...props.data.fat,
            unit: "g", fill: "var(--chart-2)"
        },
        {
            label: "protein",
            current: props.data.protein.current,
            current_norm: (props.data.protein.current / props.data.fat.goal) * 100,
            goal: props.data.protein.goal,
            // ...props.data.protein,
            unit: "g", fill: "var(--chart-2)"
        },
    ]
    return (
        <Card className=" col-span-full">
            <CardHeader className="items-center pb-0">
                <CardTitle className="capitalize">{props.title}</CardTitle>
            </CardHeader>
            <CardContent className="">
                <ChartContainer className="h-[150px] w-full" config={chartConfig}>
                    <BarChart
                        barCategoryGap="40%" 
                        barSize={24}
                        accessibilityLayer data={chartData} margin={{ top: 20 }} layout="vertical">
                        <CartesianGrid vertical={false} />
                        <YAxis
                            dataKey={"label"}
                            yAxisId={"left"}
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            className="h-full"
                        />
                        <YAxis
                            dataKey={"goal"}
                            yAxisId={"right"}
                            orientation="right"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            className="h-full"
                            tickFormatter={(value: number) => `${value}g`}

                        />
                        <XAxis
                            dataKey="current_norm"
                            type="number"
                            hide
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            domain={[0, 100]}
                        />
                        <Bar yAxisId={"left"} dataKey="current_norm" fill="" radius={8} >
                            <LabelList
                                dataKey="current_norm"
                                position="top"
                                fill="var(--foreground)"
                                fontSize={12}
                                formatter={(value: number) => `${value.toFixed(2)}g`}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}