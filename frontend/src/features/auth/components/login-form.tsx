"use client";

/**
 * DOCU: Renders and manages the personnel login form.
 * Last Updated Date: September 3, 2026
 * @returns The login form view.
 * @author Keith
 */
import React, { useState } from "react";
import Link from "next/link";
import { useLogin } from "../hooks/use-login";
import { useRedirectIfAuthenticated } from "../hooks/use-auth-guard";
import { loginSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { CompanyLogo } from "@/components/ui/brand-logos";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Mail, Lock } from "lucide-react";

export function LoginForm() {
  useRedirectIfAuthenticated();
  const { mutate, isPending, error, clearError } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const authenticationMessage = error?.includes("401")
    ? "The email or password is incorrect. Check your credentials and try again."
    : error ?? undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormErrors({});

    const validationResult = loginSchema.safeParse({ email, password });
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      });
      setFormErrors(fieldErrors);
      return;
    }

    await mutate({ email, password });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="neu-surface rounded-xl overflow-hidden">
        <CardHeader className="text-center space-y-1 pb-4 pt-6">
          <CompanyLogo className="justify-center" />
          <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
            Institutional Portal Login
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Sign in to access compliance review and wealth advisory documents
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error && (
            <Alert
              variant="destructive"
              className="border-rose-200 bg-rose-50/80 p-3 text-rose-950 shadow-sm [&>svg]:left-3 [&>svg]:top-3 [&>svg~*]:pl-6"
              title="Unable to sign in"
              message={authenticationMessage}
            />
          )}

          <form id="login-form" onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="advisor@springer.capital"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neu-inset pl-9 h-9 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {formErrors.email && (
                <p className="text-[11px] text-rose-600 font-medium">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Link href="#" className="text-[11px] text-slate-500 hover:text-slate-900">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neu-inset pl-9 h-9 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {formErrors.password && (
                <p className="text-[11px] text-rose-600 font-medium">{formErrors.password}</p>
              )}
            </div>
          </form>

          {/* Role selector quick fill for demo */}

        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2 pb-6 border-t border-white/60 bg-background/40">
          <Button
            type="submit"
            form="login-form"
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-9 rounded-md"
          >
            {isPending ? "Authenticating..." : "Sign In to Workspace"}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            New personnel?{" "}
            <Link href="/signup" className="text-slate-900 font-semibold hover:underline">
              Register Credentials
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
