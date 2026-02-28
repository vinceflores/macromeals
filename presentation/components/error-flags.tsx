import { TriangleAlert } from "lucide-react";



export function ErrorFlag({
    errorText
}: { errorText: string }) {
    return (
        <div className="flex items-center-safe space-x-1 bg-red-500 text-white py-2 px-3 rounded-lg text-xs">
            <TriangleAlert className="w-4 h-4" />
            <p > {errorText} </p>
        </div>
    )
}