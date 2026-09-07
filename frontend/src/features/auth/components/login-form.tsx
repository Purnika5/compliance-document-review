"use client";

/**
 * DOCU: Renders and manages the personnel login form in dark mode.
 * Last Updated Date: September 8, 2026
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
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

/**
 * DOCU: Renders the login form and processes user authentication submissions.
 * Last Updated Date: September 8, 2026
 * @returns The login form component.
 * @author Keith
 */
export function LoginForm() {
  useRedirectIfAuthenticated();
  const { mutate, isPending, error, clearError } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const authenticationMessage = error?.includes("401")
    ? "The email or password is incorrect. Check your credentials and try again."
    : error ?? undefined;

  /**
   * DOCU: Handles login form submission with schema validation.
   * Last Updated Date: September 8, 2026
   * @param e - Form submission event.
   * @returns Void promise.
   * @author Keith
   */
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
      <Card className="rounded-xl overflow-hidden border border-border bg-card shadow-2xl shadow-black/70">
        {/* Springer Brand Accent Hairline Strip */}
        <div className="h-[2px] bg-gradient-to-r from-emerald-600 via-[#84c22b] to-emerald-500" />

        <CardHeader className="text-center space-y-2 pb-4 pt-6">
          <CompanyLogo className="justify-center" />
          <CardTitle className="text-xl font-bold text-foreground tracking-tight">
            Institutional Portal Login
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Sign in to access compliance review and wealth advisory documents
          </CardDescription>

          {/* Role indicator pills */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="chip bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot inline-block" />
              Advisor
            </span>
            <span className="chip bg-secondary text-muted-foreground border border-border">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-dot inline-block" style={{ animationDelay: "0.6s" }} />
              Officer
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error && (
            <Alert
              variant="destructive"
              className="p-3 shadow-xs animate-slide-down"
              title="Unable to sign in"
              message={authenticationMessage}
            />
          )}

          <form id="login-form" onSubmit={handleSubmit} noValidate className="space-y-3.5">
            {/* Email Field */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-foreground/90">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  id="login-email"
                  placeholder="advisor@springercapital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-md bg-background border-border text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              {formErrors.email && (
                <p className="text-[11px] text-rose-400 font-medium animate-fade-in">{formErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/90">Password</label>
                {/* <Link href="#" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
                  Forgot?
                </Link> */}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 h-9 text-xs rounded-md bg-background border-border text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-[11px] text-rose-400 font-medium animate-fade-in">{formErrors.password}</p>
              )}
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2 pb-6 border-t border-border bg-muted/20">
          <Button
            type="submit"
            form="login-form"
            id="login-submit"
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 rounded-md transition-all hover:-translate-y-px hover:shadow-md disabled:opacity-60 disabled:translate-y-0"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Authenticating...
              </span>
            ) : (
              "Sign In to Workspace"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            New personnel?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Register Credentials
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
