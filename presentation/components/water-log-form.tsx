import { Form, useFetcher } from "react-router"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"

export type WaterLogFormProps = {
    action?: string
}

// Notice the '?' after currentDate to make it optional
export default function WaterForm({ action, currentDate }: { action?: string, currentDate?: string }) {   
    const fetcher = useFetcher();
    
    return (
        <fetcher.Form
            className="space-y-3"
            action={action || "/analytics/logging/water"} 
            method="post"
        >
            <Label htmlFor="water"> Log Water Intake (ml) </Label>
            {/* Added a check: if currentDate is missing, don't even render the input */}
            <div className="flex justify-center items-center gap-2"> 
                {currentDate && <input type="hidden" name="date" value={currentDate} />}
                <Input id="water" name="water" placeholder="1000" type="number" />
                <Button type="submit"> Log </Button>
            </div>
        </fetcher.Form>
    );
}