import { Form, useFetcher } from "react-router"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"

export type WaterLogFormProps = {
    action?: string
}

export function WaterLogForm(props: WaterLogFormProps) {
    const fetcher = useFetcher()
    return (
        <fetcher.Form
            className="space-y-3"
            action={props.action || "/analytics/logging/water"} method="post">
            <Label htmlFor="water"  > Log Water Intake (ml) </Label>
            <div className="flex justify-center items-centerq">
                <Input id="water" name="water" placeholder="1000" type="number" className="" />
                <Button type="submit"> LOg </Button>
            </div>
        </fetcher.Form>
    )
}