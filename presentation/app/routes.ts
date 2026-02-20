import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("recipes", "routes/recipes.tsx"),
  route("recipes/:id", "routes/recipe-detail.tsx"),
] satisfies RouteConfig;
