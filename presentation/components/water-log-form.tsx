import { Form, useFetcher } from "react-router"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"

export type WaterLogFormProps = {
    action?: string
}

export default function WaterForm({ 
  action, 
  currentDate 
}: { 
  action?: string, 
  currentDate: string 
}) {   
    const fetcher = useFetcher();
    const isSuccess = fetcher.data?.success;
    const isLogging = fetcher.state !== "idle";


    return (
        <fetcher.Form
            className="space-y-3"
            action={action || "/analytics/logging/water"} 
            method="post"
        >
            <Label htmlFor="water"> Log Water Intake (ml) </Label>
            <div className="flex justify-center items-center gap-2"> 
                    <input type="hidden" name="date" value={currentDate} />
                    <Input 
                        id="water" 
                        name="water" 
                        placeholder="1000" 
                        type="number" 
                        disabled={isLogging}
                    />
                    <Button type="submit" disabled={isLogging}> 
                        {isLogging ? "Logging..." : "Log"} 
                    </Button>
                </div>

            
                {isSuccess && (
                    <p className="text-sm text-green-600 font-medium animate-in fade-in slide-in-from-top-1">
                        Water logged successfully!
                    </p>
                )}
                
                
                {fetcher.data?.error && (
                    <p className="text-sm text-red-600 font-medium">
                        {fetcher.data.error}
                    </p>
                )}
        </fetcher.Form>
    );
}