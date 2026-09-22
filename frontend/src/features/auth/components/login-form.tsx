"use client";

/**
 * DOCU: Renders and manages the personnel login form matching the institutional UI.
 * Last Updated Date: September 15, 2026
 * @returns The login form view.
 * @author Keith
 */
import React, { useState } from "react";
import Link from "next/link";
import { useLogin } from "../hooks/use-login";
import { useRedirectIfAuthenticated } from "../hooks/use-auth-guard";
import { loginSchema, validateEmail } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CompanyLogo } from "@/components/ui/brand-logos";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginForm() {
  useRedirectIfAuthenticated();
  const { mutate, isPending, error, clearError } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validFields, setValidFields] = useState<Record<string, boolean>>({});

  const handleEmailChange = (val: string) => {
    setEmail(val);
    clearError();
    setTouched((prev) => ({ ...prev, email: true }));
    const result = validateEmail(val);
    if (!result.success && result.error) {
      setFormErrors((prev) => ({ ...prev, email: result.error! }));
      setValidFields((prev) => ({ ...prev, email: false }));
    } else {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
      setValidFields((prev) => ({ ...prev, email: true }));
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    clearError();
    setTouched((prev) => ({ ...prev, password: true }));
    if (!val || val.trim().length === 0) {
      setFormErrors((prev) => ({ ...prev, password: "Password is required" }));
      setValidFields((prev) => ({ ...prev, password: false }));
    } else {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
      setValidFields((prev) => ({ ...prev, password: true }));
    }
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const authenticationMessage = error?.includes("401")
    ? "The email or password is incorrect. Check your credentials and try again."
    : error ?? undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormErrors({});
    setTouched({ email: true, password: true });

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
    <div className="w-full">
      {/* Mobile Brand Logo */}
      <div className="lg:hidden mb-6 flex justify-start">
        <CompanyLogo />
      </div>

      {/* Header */}
      <div className="space-y-1.5 mb-7 text-left">
        <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
          Sign in to your account
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your institutional credentials to access the Springer Capital investor &amp; advisor portal
        </p>
      </div>

      {error && (
        <Alert
          variant="destructive"
          title="Unable to sign in"
          message={authenticationMessage}
          className="mb-5 p-3 text-xs bg-red-50 border-red-300 text-red-900 [&>svg]:text-red-600 [&>h5]:text-red-700"
        />
      )}

      <form id="login-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Institutional / Corporate Email Field */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
            Institutional / Corporate Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="email"
              id="login-email"
              placeholder="name@springercapital.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onPaste={() => markTouched("email")}
              onBlur={() => handleEmailChange(email)}
              className={cn(
                "w-full h-11 pl-10 pr-9 rounded-lg border bg-white text-slate-900 text-sm placeholder:text-slate-400 transition-all outline-hidden focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800",
                touched.email && formErrors?.email
                  ? "border-rose-400 ring-1 ring-rose-400/50"
                  : touched.email && validFields?.email
                    ? "border-emerald-500 ring-1 ring-emerald-500/30"
                    : "border-slate-200"
              )}
            />
            {touched.email && validFields?.email && (
              <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 pointer-events-none" />
            )}
            {touched.email && formErrors?.email && (
              <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 pointer-events-none" />
            )}
          </div>
          {touched.email && formErrors.email && (
            <p className="text-[11px] text-rose-500 font-medium">{formErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onPaste={() => markTouched("password")}
              onBlur={() => handlePasswordChange(password)}
              className={cn(
                "w-full h-11 pl-10 pr-10 rounded-lg border bg-white text-slate-900 text-sm placeholder:text-slate-400 transition-all outline-hidden focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800",
                touched.password && formErrors?.password
                  ? "border-rose-400 ring-1 ring-rose-400/50"
                  : touched.password && validFields?.password
                    ? "border-emerald-500 ring-1 ring-emerald-500/30"
                    : "border-slate-200"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {touched.password && formErrors.password && (
            <p className="text-[11px] text-rose-500 font-medium">{formErrors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            form="login-form"
            id="login-submit"
            disabled={isPending}
            className="w-full bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] active:bg-[#10221c] text-white font-medium text-sm h-11 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/10 hover:shadow-lg disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (
              <span className="flex items-center gap-2 text-white">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Authenticating...
              </span>
            ) : (
              <>
                <span>Sign in to Institutional Portal</span>
                <ArrowRight className="h-4 w-4 text-white" />
              </>
            )}
          </Button>
        </div>

        {/* Register Account Link */}
        <div className="pt-3 text-center">
          <p className="text-xs text-slate-600">
            Don&apos;t have institutional access?{" "}
            <Link href="/signup" className="font-bold text-slate-900 hover:underline inline-flex items-center gap-0.5">
              <span>Register for access</span>
              <span className="text-sm">→</span>
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
