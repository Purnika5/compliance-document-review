"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSignup } from "../hooks/use-signup";
import { useRedirectIfAuthenticated } from "../hooks/use-auth-guard";
import { signupSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { User, Mail, Lock, ShieldCheck, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export function SignupForm() {
  useRedirectIfAuthenticated();
  const { mutate, isPending, error, clearError } = useSignup();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"Advisor" | "Officer">("Advisor");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormErrors({});

    const validationResult = signupSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
      role,
    });

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

    await mutate({ name, email, password, confirmPassword, role });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="neu-surface rounded-xl overflow-hidden">
        <CardHeader className="text-center space-y-1 pb-4 pt-6">
          <div className="mx-auto h-10 w-10 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
            SC
          </div>
          <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
            Create Personnel Account
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Register compliance reviewer or financial advisor credentials
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error && (
            <Alert
              variant="destructive"
              title="Registration Error"
              message={error}
            />
          )}

          <form id="signup-form" onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="neu-inset pl-9 h-9 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {formErrors.name && (
                <p className="text-[11px] text-rose-600 font-medium">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="name@springercapital.com"
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
              <label className="text-xs font-semibold text-slate-700">Access Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("Advisor")}
                  className={cn(
                    "p-2.5 rounded-md border text-left flex items-start space-x-2 transition-colors cursor-pointer",
                    role === "Advisor"
                      ? "border-primary bg-blue-50 font-bold shadow-inner"
                      : "border-slate-200 bg-background hover:bg-blue-50 text-slate-600"
                  )}
                >
                  <Briefcase className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">Advisor</p>
                    <p className="text-[10px] text-slate-500 font-normal">Submits documents</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("Officer")}
                  className={cn(
                    "p-2.5 rounded-md border text-left flex items-start space-x-2 transition-colors cursor-pointer",
                    role === "Officer"
                      ? "border-primary bg-blue-50 font-bold shadow-inner"
                      : "border-slate-200 bg-background hover:bg-blue-50 text-slate-600"
                  )}
                >
                  <ShieldCheck className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">Officer</p>
                    <p className="text-[10px] text-slate-500 font-normal">Reviews & approves</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neu-inset pl-9 h-9 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {formErrors.password && (
                <p className="text-[11px] text-rose-600 font-medium">{formErrors.password}</p>
              )}
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="neu-inset pl-9 h-9 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {formErrors.confirmPassword && (
                <p className="text-[11px] text-rose-600 font-medium">{formErrors.confirmPassword}</p>
              )}
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2 pb-6 border-t border-white/60 bg-background/40">
          <Button
            type="submit"
            form="signup-form"
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-9 rounded-md"
          >
            {isPending ? "Creating Account..." : "Complete Registration"}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Already registered?{" "}
            <Link href="/login" className="text-slate-900 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
