"use client";

import { Form, Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export type RegisterParams = {
  action?: string;
};

export default function RegisterForm({ action }: RegisterParams) {
  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
      <Link to="/" className="w-full text-center py-6 text-2xl font-bold">MacroMeals </Link>
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h3 className="text-balance text-center text-lg font-semibold text-foreground dark:text-foreground">
            Create an Account
          </h3>
          <p className="text-pretty text-center text-sm text-muted-foreground dark:text-muted-foreground">
            Enter your details below to get started.
          </p>

          <Form method="post" action={action} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name" className="text-sm font-medium">
                  First Name
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  // placeholder="Abbey"
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name" className="text-sm font-medium">
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  //  placeholder="McMillan"
                  className="mt-2"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                //   placeholder="abbey@example.com"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                //     placeholder="**************"
                className="mt-2"
                required
              />
            </div>

            <Button type="submit" className="mt-4 w-full py-2 font-medium">
              Sign Up
            </Button>
          </Form>

          <p className="text-pretty mt-6 text-sm text-muted-foreground dark:text-muted-foreground text-center">
            Already have an account?{" "}
            <a
              href="/auth/login"
              className="font-medium text-primary hover:text-primary/90"
            >
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
