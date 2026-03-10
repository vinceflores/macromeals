import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("layouts/protected_routes.tsx", [
    index("routes/home.tsx"),
    route("recipes", "routes/recipes.tsx"),
    route("recipes/:id", "routes/recipe-detail.tsx"),
    route("edit/:kind/:id", "routes/edit-item.tsx"),
    route("analytics/macros", "routes/analytics/macros.tsx"),
    route("analytics/logging", "routes/analytics/logging.tsx"),
    route("analytics/logging/water", "routes/analytics/water_log.tsx")
  ]),

  route("auth/login", "routes/auth/login.tsx"),
  route("auth/reset-password", "routes/auth/reset-password.tsx"),
  route("auth/reset-password/verify", "routes/auth/reset-password.verify.tsx"),
  route("auth/reset-password/reset", "routes/auth/reset-password.reset.tsx"),
  route("auth/reset-password/resend", "routes/auth/reset-password.resend.tsx"),
  route("auth/register", "routes/auth/register.tsx"),
  route("profile", "routes/profile.tsx"),
  route("auth/logout", "routes/auth/logout.tsx"),
] satisfies RouteConfig;
