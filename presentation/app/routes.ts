import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("layouts/protected_routes.tsx", [
        index("routes/home.tsx"),
        route("recipes", "routes/recipes.tsx"),
        route("recipes/:id", "routes/recipe-detail.tsx"),
    ]),
    
    route("auth/login", "routes/login.tsx"),
    route("auth/reset-password", "routes/auth/reset-password.tsx"),
    route("auth/reset-password/verify", "routes/auth/reset-password.verify.tsx"),
    route("auth/reset-password/reset", "routes/auth/reset-password.reset.tsx"),
    route("auth/reset-password/resend", "routes/auth/reset-password.resend.tsx"),
    
    route("auth/logout", "routes/logout.tsx"),
] satisfies RouteConfig;
