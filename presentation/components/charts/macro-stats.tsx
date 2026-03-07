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

export function CaloriesStat(props: ProgressStatProps) {
    const [angles, setAngles] = useState({
        startAngle: 0,
        endAngle: 0,
    })
    const data = props.chartData[0]

    useEffect(() => {
        const startAngle = 90
        const endAngle = 90 - 360 * data.current / data.goal
        setAngles({
            startAngle, endAngle
        })
    }, [data.goal, data.current])

    return (
        <Card className="flex col-span-2">
            <CardHeader className="items-center pb-0">
                <CardTitle className="capitalize">{props.title}</CardTitle>
            </CardHeader>
            <CardContent className="">
                <ChartContainer
                    config={props.chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <RadialBarChart
                        data={props.chartData}
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
                        <RadialBar dataKey={props.title} background cornerRadius={10} />
                        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-4xl font-bold"
                                                >
                                                    {data.current}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    {data.unit}
                                                </tspan>
                                            </text>
                                        )
                                    }
                                }}
                            />
                        </PolarRadiusAxis>
                    </RadialBarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 leading-none font-medium">
                    Out of  {data.goal} {data.unit}
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
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
                        <CartesianGrid vertical={false} />
                        <YAxis
                            type="number"
                            orientation="right"
                            tickLine={true}
                            tickMargin={10}
                            axisLine={true}
                            domain={[0, props.goal]}
                            className="h-full"
                        />
                        {/* <XAxis
                            dataKey="xlabel"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        /> */}
                        <Bar dataKey="water" fill="#99CFFF" radius={8} >
                            <LabelList
                                dataKey="water"
                                position="center"

                                fill="#000"
                                fontSize={14}
                                formatter={(value: number) => `${value} ml`}
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
        { label: "carb", ...props.data.carbs, unit: "g", fill: "var(--chart-2)" },
        { label: "fat", ...props.data.fat, unit: "g", fill: "var(--chart-2)" },
        { label: "protein", ...props.data.protein, unit: "g", fill: "var(--chart-2)" },
    ]
    return (
        <Card className=" col-span-full">
            <CardHeader className="items-center pb-0">
                <CardTitle className="capitalize">{props.title}</CardTitle>
            </CardHeader>
            <CardContent className="">
                <ChartContainer className="h-[150px] w-full" config={chartConfig}>
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }} layout="vertical">
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
                            dataKey="goal"
                            type="number"
                            hide
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}

                        />
                        <Bar yAxisId={"left"} dataKey="current" fill="" radius={8} >
                            <LabelList
                                dataKey="current"
                                position="right"
                                // className="w-[50px]"
                                fill="var(--foreground)"
                                fontSize={12}
                                formatter={(value: number) => `${value}g`}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}