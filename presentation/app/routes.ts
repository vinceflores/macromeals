import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("layouts/protected_routes.tsx", [
        index("routes/home.tsx"),
        route("recipes", "routes/recipes.tsx"),
        route("recipes/:id", "routes/recipe-detail.tsx"),
    ]),
    
    route("auth/login", "routes/login.tsx"),
    route("auth/logout", "routes/logout.tsx"),
] satisfies RouteConfig;
