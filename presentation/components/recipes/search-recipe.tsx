import { Form, useFetcher, useRouteLoaderData } from "react-router"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import { useState } from "react"


export function FatSecretRecipeSearchBar() {
    const fetcher = useFetcher()
    return (
        <fetcher.Form className="w-full space-y-3" method="get" action="/recipes/search/external/">
            <Label htmlFor="search_recipe"> Search For Recipe </Label>
            <div className="flex items-center justify-center gap-2">
                <Input name="q" id="search_recipe" placeholder="Chicken" />
                <Input hidden defaultValue={0} name="page" type="number" />
                <Button type="submit"> Search  </Button>
            </div>
        </fetcher.Form>
    )
}

export function FatSecretSearchResults(){
    return <div>Results</div>
}