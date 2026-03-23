import { Form } from "react-router"
import type { ReactNode } from "react"

import type { FoodSearchResult } from "~/lib/recipes-api"

export type RecipeFormIngredientRow = {
  id: number
  name: string
  quantity: string
  unit: string
  macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

type RecipeFormBlockProps = {
  name: string
  description: string
  servings: string
  recipe_image: string
  submitLabel: string
  isSubmitting: boolean
  servingsDisabled?: boolean
  hiddenFields?: ReactNode
  rowSuggestions: Record<number, FoodSearchResult[]>
  rowSearchLoading: Record<number, boolean>
  ingredientRows: RecipeFormIngredientRow[]
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onServingsChange: (value: string) => void
  onRecipeImageChange: (value: string) => void
  onSetRowValue: (rowId: number, key: "name" | "quantity" | "unit", value: string) => void
  onIngredientNameChange: (rowId: number, value: string) => void
  onSelectIngredientSuggestion: (rowId: number, food: FoodSearchResult) => void
  onRemoveIngredientRow: (rowId: number) => void
  onAddIngredientRow: () => void
}

export default function RecipeFormBlock({
  name,
  description,
  servings,
  recipe_image,
  submitLabel,
  isSubmitting,
  servingsDisabled = false,
  hiddenFields,
  rowSuggestions,
  rowSearchLoading,
  ingredientRows,
  onNameChange,
  onDescriptionChange,
  onServingsChange,
  onRecipeImageChange,
  onSetRowValue,
  onIngredientNameChange,
  onSelectIngredientSuggestion,
  onRemoveIngredientRow,
  onAddIngredientRow,
}: RecipeFormBlockProps) {
  return (
    <Form method="post" className="space-y-3">
      {hiddenFields}

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="Chicken and rice bowl"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="High-protein weekday meal"
          rows={3}
        />
      </div>

      <div>
        <label htmlFor="servings" className="block text-sm font-medium">
          Servings
        </label>
        <input
          id="servings"
          name="servings"
          type="number"
          min={1}
          step="1"
          value={servings}
          onChange={(event) => onServingsChange(event.target.value)}
          required
          disabled={servingsDisabled}
          className="mt-1 w-32 rounded border px-3 py-2"
        />
      </div>
      <div className="w-full">
        <label htmlFor="recipe_image" className="block text-sm font-medium">
          Image <span className="italic font-light">(Optional)</span>
        </label>
        <input
          id="recipe_image"
          name="recipe_image"
          type="text"
          value={recipe_image}
          onChange={(event) => onRecipeImageChange(event.target.value)}
          placeholder="URL (e.g. https://image.png)"
          className="mt-1 w-full rounded border px-3 py-2"
        />
        {/* TODO upload drag/drop */}
      </div>
      <div>
        <p className="block text-sm font-medium">Ingredients</p>
        <div className="mt-2 space-y-2">
          {ingredientRows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-12 gap-2">
              <div className="relative col-span-6">
                <input
                  name="ingredient_name"
                  required
                  value={row.name}
                  onChange={(event) => onIngredientNameChange(row.id, event.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Ingredient"
                  autoComplete="off"
                />
                {rowSearchLoading[row.id] ? (
                  <p className="mt-1 text-xs text-zinc-500">Searching USDA...</p>
                ) : null}
                {!!rowSuggestions[row.id]?.length ? (
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border bg-background  shadow">
                    {rowSuggestions[row.id].map((food) => (
                      <li key={food.fdcId} className="bg-background dark:hover:bg-gray-900 p-1">
                        <button
                          type="button"
                          onClick={() => onSelectIngredientSuggestion(row.id, food)}
                          className="w-full rounded px-2 py-1 text-left hover:bg-zinc-100 dark:hover:bg-gray-900 mx-0"
                        >
                          <p className="text-sm">{food.description}</p>
                          {food.brandOwner ? (
                            <p className="text-xs text-zinc-500">Brand: {food.brandOwner}</p>
                          ) : null}
                          <p className="text-xs text-zinc-600">
                            {food.macros.calories} kcal | P {food.macros.protein}g | C {food.macros.carbs}g | F {food.macros.fat}g
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <input
                name="ingredient_quantity"
                type="number"
                step="any"
                min={0.01}
                required
                value={row.quantity}
                onChange={(event) => onSetRowValue(row.id, "quantity", event.target.value)}
                className="col-span-3 rounded border px-3 py-2"
                placeholder="Size"
              />
              <input
                name="ingredient_unit"
                value={row.unit}
                required
                onChange={(event) => onSetRowValue(row.id, "unit", event.target.value)}
                className="col-span-2 rounded border px-3 py-2"
                placeholder="Unit"
              />
              <button
                type="button"
                onClick={() => onRemoveIngredientRow(row.id)}
                disabled={ingredientRows.length === 1}
                className="col-span-1 rounded border px-2 py-2 text-sm disabled:opacity-40"
                aria-label={`Remove ingredient row ${index + 1}`}
              >
                X
              </button>
              <input type="hidden" name="ingredient_calories" value={row.macros.calories} />
              <input type="hidden" name="ingredient_protein" value={row.macros.protein} />
              <input type="hidden" name="ingredient_carbs" value={row.macros.carbs} />
              <input type="hidden" name="ingredient_fat" value={row.macros.fat} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddIngredientRow}
          className="mt-2 rounded border px-3 py-2 text-sm"
        >
          Add Ingredient
        </button>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </Form>
  )
}
