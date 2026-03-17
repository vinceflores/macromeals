import type { ReactNode } from "react";
import { Link } from "react-router";

import { UserNav } from "./user-navigation";
import { ModeToggle } from "components/mode-toggle";

export type HeaderProfile = {
  email: string;
  first_name: string;
  last_name: string;
};

type AppHeaderProps = {
  profile: HeaderProfile;
  children?: ReactNode;
  showHome?: boolean;
};

export default function AppHeader({
  profile,
  children,
  showHome = true,
}: AppHeaderProps) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-6 justify-between">
        <Link to="/" className="font-bold text-xl tracking-tight text-primary">MacroMeals</Link>

        <div className="flex items-center space-x-4">
          {children}
          {showHome ? (
            <Link
              to="/"
              className="rounded border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Home
            </Link>
          ) : null}
          {/* Keep account actions consistent across pages. */}
          <UserNav
            email={profile.email}
            first_name={profile.first_name}
            last_name={profile.last_name}
          />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
