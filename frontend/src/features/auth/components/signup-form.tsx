"use client";

/**
 * DOCU: Renders and manages the personnel registration form in institutional dark mode.
 * Features real-time field validation for Full Name, Work Email, Passwords, and Terms.
 * Last Updated Date: September 13, 2026
 * @returns The signup form view.
 * @author Keith
 */
import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSignup } from "../hooks/use-signup";
import { useRedirectIfAuthenticated } from "../hooks/use-auth-guard";
import {
  signupSchema,
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { CompanyLogo } from "@/components/ui/brand-logos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DOCU: Renders the signup form and processes personnel registration with real-time validation.
 * Last Updated Date: September 13, 2026
 * @returns The signup form component.
 * @author Keith
 */
export function SignupForm() {
  useRedirectIfAuthenticated();
  const { mutate, isPending, error, clearError } = useSignup();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<"Advisor" | "Officer">("Advisor");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validFields, setValidFields] = useState<Record<string, boolean>>({});
  const termsScrollRef = useRef<HTMLDivElement>(null);

  const clearFieldError = (field: string) =>
    setFormErrors((prev) => {
      const n = { ...prev };
      delete n[field];
      return n;
    });

  // Real-time validation handlers
  const handleNameChange = (val: string) => {
    setName(val);
    const isTouched = touched.name || val.length > 0;
    if (!touched.name && val.length > 0) {
      setTouched((prev) => ({ ...prev, name: true }));
    }

    if (isTouched) {
      const result = validateName(val);
      if (!result.success && result.error) {
        setFormErrors((prev) => ({ ...prev, name: result.error! }));
        setValidFields((prev) => ({ ...prev, name: false }));
      } else {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.name;
          return next;
        });
        setValidFields((prev) => ({ ...prev, name: true }));
      }
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const isTouched = touched.email || val.length > 0;
    if (!touched.email && val.length > 0) {
      setTouched((prev) => ({ ...prev, email: true }));
    }

    if (isTouched) {
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
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    const isTouched = touched.password || val.length > 0;
    if (!touched.password && val.length > 0) {
      setTouched((prev) => ({ ...prev, password: true }));
    }

    if (isTouched) {
      const result = validatePassword(val);
      if (!result.success && result.error) {
        setFormErrors((prev) => ({ ...prev, password: result.error! }));
        setValidFields((prev) => ({ ...prev, password: false }));
      } else {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.password;
          return next;
        });
        setValidFields((prev) => ({ ...prev, password: true }));
      }
    }

    if (confirmPassword && (touched.confirmPassword || confirmPassword.length > 0)) {
      const confirmResult = validateConfirmPassword(val, confirmPassword);
      if (!confirmResult.success && confirmResult.error) {
        setFormErrors((prev) => ({ ...prev, confirmPassword: confirmResult.error! }));
        setValidFields((prev) => ({ ...prev, confirmPassword: false }));
      } else {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.confirmPassword;
          return next;
        });
        setValidFields((prev) => ({ ...prev, confirmPassword: true }));
      }
    }
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    const isTouched = touched.confirmPassword || val.length > 0;
    if (!touched.confirmPassword && val.length > 0) {
      setTouched((prev) => ({ ...prev, confirmPassword: true }));
    }

    if (isTouched) {
      const result = validateConfirmPassword(password, val);
      if (!result.success && result.error) {
        setFormErrors((prev) => ({ ...prev, confirmPassword: result.error! }));
        setValidFields((prev) => ({ ...prev, confirmPassword: false }));
      } else {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.confirmPassword;
          return next;
        });
        setValidFields((prev) => ({ ...prev, confirmPassword: true }));
      }
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "name") handleNameChange(name);
    if (field === "email") handleEmailChange(email);
    if (field === "password") handlePasswordChange(password);
    if (field === "confirmPassword") handleConfirmPasswordChange(confirmPassword);
  };

  const handleTermsScroll = useCallback(() => {
    const el = termsScrollRef.current;
    if (!el || hasReadTerms) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    if (atBottom) {
      setHasReadTerms(true);
      setAcceptedTerms(true);
      clearFieldError("terms");
    }
  }, [hasReadTerms]);

  const handleAcceptTerms = () => {
    setAcceptedTerms(true);
    setHasReadTerms(true);
    clearFieldError("terms");
    setShowTermsModal(false);
  };

  const getPasswordStrength = (pwd: string): number => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(password);
  const strengthColor =
    strengthScore <= 1
      ? "bg-rose-500"
      : strengthScore === 2
      ? "bg-amber-500"
      : strengthScore === 3
      ? "bg-yellow-400"
      : "bg-emerald-500";
  const strengthLabel =
    strengthScore === 0
      ? ""
      : strengthScore <= 1
      ? "Weak"
      : strengthScore === 2
      ? "Fair"
      : strengthScore === 3
      ? "Good"
      : "Strong";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormErrors({});

    // Touch all fields on submit attempt
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    const extraErrors: Record<string, string> = {};
    if (!acceptedTerms) {
      extraErrors.terms = "You must read and accept the Terms & Conditions.";
    }
    if (password !== confirmPassword) {
      extraErrors.confirmPassword = "Passwords do not match.";
    }

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
      setFormErrors({ ...fieldErrors, ...extraErrors });
      return;
    }

    if (Object.keys(extraErrors).length > 0) {
      setFormErrors(extraErrors);
      return;
    }

    await mutate({ name, email, password, confirmPassword, role });
  };

  const isEmailDomainValid = email.toLowerCase().endsWith("@springercapital.com");

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="rounded-xl overflow-hidden border border-border bg-card shadow-2xl shadow-black/70">
        {/* Springer Brand Accent Hairline */}
        <div className="h-[2px] bg-gradient-to-r from-emerald-600 via-[#84c22b] to-emerald-500" />

        <CardHeader className="text-center space-y-1 pb-2 pt-4">
          <CompanyLogo className="justify-center" />
          <CardTitle className="text-lg font-bold text-foreground tracking-tight">
            Create Personnel Account
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Register compliance reviewer or financial advisor credentials
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          {error && (
            <Alert
              variant="destructive"
              title="Registration Error"
              message={error}
              className="p-2.5 shadow-xs animate-slide-down text-xs"
            />
          )}

          <form id="signup-form" onSubmit={handleSubmit} noValidate className="space-y-2.5">
            {/* Full Name Field with Real-Time Validation */}
            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/90">Full Name</label>
                {touched.name && validFields.name && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
                    <Check className="h-3 w-3" /> Valid
                  </span>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  id="signup-name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => handleBlur("name")}
                  className={cn(
                    "pl-9 pr-9 h-9 text-xs rounded-md bg-background border-border text-foreground transition-all focus-visible:ring-1 focus-visible:ring-primary",
                    touched.name && formErrors?.name && "border-rose-500 ring-1 ring-rose-500/80",
                    touched.name && validFields?.name && "border-emerald-500/60 ring-1 ring-emerald-500/30"
                  )}
                />
                {touched.name && validFields?.name && (
                  <Check className="absolute right-3 top-2.5 h-3.5 w-3.5 text-emerald-400 pointer-events-none animate-fade-in" />
                )}
                {touched.name && formErrors?.name && (
                  <AlertCircle className="absolute right-3 top-2.5 h-3.5 w-3.5 text-rose-400 pointer-events-none animate-fade-in" />
                )}
              </div>
              {touched.name && formErrors?.name && (
                <p className="text-[11px] text-rose-400 font-medium animate-fade-in flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* Work Email Field with Real-Time Validation & Domain Badge */}
            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/90">Work Email</label>
                {touched.email && validFields.email && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
                    <Check className="h-3 w-3" /> Corporate Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  id="signup-email"
                  placeholder="name@springercapital.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={cn(
                    "pl-9 pr-9 h-9 text-xs rounded-md bg-background border-border text-foreground transition-all focus-visible:ring-1 focus-visible:ring-primary",
                    touched.email && formErrors?.email && "border-rose-500 ring-1 ring-rose-500/80",
                    touched.email && validFields?.email && "border-emerald-500/60 ring-1 ring-emerald-500/30"
                  )}
                />
                {touched.email && validFields?.email && (
                  <Check className="absolute right-3 top-2.5 h-3.5 w-3.5 text-emerald-400 pointer-events-none animate-fade-in" />
                )}
                {touched.email && formErrors?.email && (
                  <AlertCircle className="absolute right-3 top-2.5 h-3.5 w-3.5 text-rose-400 pointer-events-none animate-fade-in" />
                )}
              </div>

              {/* Real-time Domain Hint Pill */}
              {email.length > 0 && (
                <div className="pt-0.5 flex items-center gap-1.5 animate-fade-in">
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border font-mono font-medium transition-all",
                      isEmailDomainValid
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                        : "bg-muted/80 text-muted-foreground border-border"
                    )}
                  >
                    @springercapital.com
                  </span>
                  {isEmailDomainValid ? (
                    <span className="text-[10px] text-emerald-400 font-medium">Domain match</span>
                  ) : (
                    <span className="text-[10px] text-amber-400/90 font-medium">Must end with corporate domain</span>
                  )}
                </div>
              )}

              {touched.email && formErrors?.email && (
                <p className="text-[11px] text-rose-400 font-medium animate-fade-in flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Access Role */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-foreground/90">Access Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="role-advisor"
                  onClick={() => {
                    setRole("Advisor");
                    clearFieldError("role");
                  }}
                  className={cn(
                    "p-2.5 rounded-lg border text-left flex items-start space-x-2 transition-all cursor-pointer",
                    role === "Advisor"
                      ? "border-primary bg-emerald-950/40 border-l-[3px] border-l-primary"
                      : "border-border bg-card/60 hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Briefcase
                    className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      role === "Advisor" ? "text-emerald-400" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        role === "Advisor" ? "text-emerald-300" : "text-foreground"
                      )}
                    >
                      Advisor
                    </p>
                    <p className="text-[10px] text-muted-foreground font-normal">Submits documents</p>
                  </div>
                </button>

                <button
                  type="button"
                  id="role-officer"
                  onClick={() => {
                    setRole("Officer");
                    clearFieldError("role");
                  }}
                  className={cn(
                    "p-2.5 rounded-lg border text-left flex items-start space-x-2 transition-all cursor-pointer",
                    role === "Officer"
                      ? "border-cyan-700 bg-cyan-950/40 border-l-[3px] border-l-cyan-400"
                      : "border-border bg-card/60 hover:bg-muted text-muted-foreground"
                  )}
                >
                  <ShieldCheck
                    className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      role === "Officer" ? "text-cyan-400" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        role === "Officer" ? "text-cyan-300" : "text-foreground"
                      )}
                    >
                      Officer
                    </p>
                    <p className="text-[10px] text-muted-foreground font-normal">Reviews &amp; approves</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Create Password */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-foreground/90">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  id="signup-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  className={cn(
                    "pl-9 pr-9 h-9 text-xs rounded-md bg-background border-border text-foreground transition-all focus-visible:ring-1 focus-visible:ring-primary",
                    touched.password && formErrors?.password && "border-rose-500 ring-1 ring-rose-500/80",
                    touched.password && validFields?.password && "border-emerald-500/60 ring-1 ring-emerald-500/30"
                  )}
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

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="space-y-1 animate-fade-in pt-0.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((segment) => (
                      <div
                        key={segment}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all duration-300",
                          strengthScore >= segment ? strengthColor : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  {strengthLabel && (
                    <p
                      className={cn(
                        "text-[10px] font-semibold",
                        strengthScore <= 1
                          ? "text-rose-400"
                          : strengthScore === 2
                          ? "text-amber-400"
                          : strengthScore === 3
                          ? "text-yellow-400"
                          : "text-emerald-400"
                      )}
                    >
                      {strengthLabel} password
                    </p>
                  )}
                </div>
              )}

              {touched.password && formErrors?.password && (
                <p className="text-[11px] text-rose-400 font-medium animate-fade-in flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                  {formErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/90">Confirm Password</label>
                {touched.confirmPassword && confirmPassword.length > 0 && (
                  validFields.confirmPassword ? (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
                      <Check className="h-3 w-3" /> Match
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="h-3 w-3" /> Mismatch
                    </span>
                  )
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  id="signup-confirm-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  onBlur={() => handleBlur("confirmPassword")}
                  className={cn(
                    "pl-9 pr-16 h-9 text-xs rounded-md bg-background border-border text-foreground transition-all focus-visible:ring-1 focus-visible:ring-primary",
                    touched.confirmPassword && formErrors?.confirmPassword && "border-rose-500 ring-1 ring-rose-500/80 bg-rose-950/20 text-rose-100",
                    touched.confirmPassword && validFields?.confirmPassword && "border-emerald-500/60 ring-1 ring-emerald-500/30"
                  )}
                />
                <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
                  {touched.confirmPassword && formErrors?.confirmPassword && (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-400 animate-fade-in" />
                  )}
                  {touched.confirmPassword && validFields?.confirmPassword && (
                    <Check className="h-3.5 w-3.5 text-emerald-400 animate-fade-in" />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {touched.confirmPassword && formErrors?.confirmPassword && (
                <p className="text-[11px] text-rose-400 font-semibold animate-fade-in flex items-center gap-1.5 pt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block shrink-0 animate-pulse" />
                  {formErrors.confirmPassword}
                </p>
              )}
              {touched.confirmPassword && validFields?.confirmPassword && (
                <p className="text-[11px] text-emerald-400 font-medium animate-fade-in flex items-center gap-1 pt-0.5">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>

            {/* ── Terms & Conditions ───────────────────────── */}
            <div className="space-y-1">
              <button
                type="button"
                id="signup-terms-trigger"
                onClick={() => setShowTermsModal(true)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer group",
                  acceptedTerms
                    ? "border-emerald-800/60 bg-emerald-950/30"
                    : formErrors.terms
                    ? "border-rose-900/60 bg-rose-950/30"
                    : "border-border bg-card hover:border-border/80 hover:bg-muted/40"
                )}
              >
                {/* Custom checkbox display */}
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-all shrink-0",
                    acceptedTerms
                      ? "bg-primary border-primary"
                      : formErrors.terms
                      ? "border-rose-500 bg-background"
                      : "border-muted-foreground/60 bg-background group-hover:border-primary"
                  )}
                >
                  {acceptedTerms && (
                    <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">
                    I agree to the{" "}
                    <span className="text-primary font-semibold group-hover:underline">Terms &amp; Conditions</span>
                    {" "}&amp;{" "}
                    <span className="text-primary font-semibold group-hover:underline">Privacy Policy</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {acceptedTerms ? (
                      <span className="text-emerald-400 font-semibold">✓ Read &amp; accepted</span>
                    ) : (
                      "Click to read and accept the full terms"
                    )}
                  </p>
                </div>

                {!acceptedTerms && (
                  <svg
                    className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {formErrors.terms && (
                <p className="text-[11px] text-rose-400 font-medium animate-fade-in flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                  {formErrors.terms}
                </p>
              )}
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 pt-2 pb-4 border-t border-border bg-muted/20">
          <Button
            type="submit"
            form="signup-form"
            id="signup-submit"
            disabled={isPending}
            className="w-full bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white font-semibold text-xs h-9 rounded-md transition-all hover:-translate-y-px hover:shadow-md disabled:opacity-60 disabled:translate-y-0 cursor-pointer"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating Account...
              </span>
            ) : (
              "Complete Registration"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Already registered?{" "}
            <Link href="/login" className="text-[#24A152] hover:text-[#54d0a2] font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* ── Terms & Conditions Modal ─────────────────────────────────── */}
      <Dialog open={showTermsModal} onOpenChange={(open) => { if (open) setShowTermsModal(true); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 [&>button:last-of-type]:hidden bg-card border border-border shadow-2xl shadow-black/80">
          <div className="h-[2px] bg-gradient-to-r from-emerald-600 via-[#84c22b] to-emerald-500" />

          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-foreground">Terms &amp; Conditions</DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
                  Springer Capital Institutional Platform — Please read in full
                </DialogDescription>
              </div>
            </div>

            {!hasReadTerms && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-amber-950/40 border border-amber-800/60 animate-fade-in">
                <svg className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <p className="text-[11px] text-amber-300 font-medium">
                  Scroll to the bottom to accept
                </p>
              </div>
            )}
            {hasReadTerms && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-950/40 border border-emerald-800/60 animate-fade-in">
                <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-[11px] text-emerald-300 font-medium">
                  You&apos;ve read the full terms — agreement auto-accepted!
                </p>
              </div>
            )}
          </DialogHeader>

          {/* Scrollable T&C Content */}
          <div
            ref={termsScrollRef}
            onScroll={handleTermsScroll}
            className="overflow-y-auto max-h-[340px] px-5 py-4 space-y-4 text-xs text-muted-foreground leading-relaxed"
          >
            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">1. Acceptance of Terms</h3>
              <p>By registering for and using the Springer Capital Institutional Compliance &amp; Wealth Advisory Platform (&ldquo;Platform&rdquo;), you agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;). These Terms constitute a legally binding agreement between you and Springer Capital Group (&ldquo;Company&rdquo;). If you do not agree to all of these Terms, do not access or use the Platform.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">2. Authorized Personnel Only</h3>
              <p>Access to this Platform is strictly limited to authorized personnel of Springer Capital Group. Each account is personal and non-transferable. You are solely responsible for maintaining the confidentiality of your login credentials. Any activity conducted under your account shall be deemed to have been authorized by you. Unauthorized access or use is strictly prohibited and may result in civil and criminal penalties.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">3. Compliance Obligations</h3>
              <p>All documents, records, and data submitted or reviewed through this Platform are subject to applicable financial regulations including but not limited to FINRA Rule 2111, SEC Rule 17a-4, and the Dodd-Frank Wall Street Reform and Consumer Protection Act. Personnel must ensure that all submissions are accurate, complete, and compliant with applicable regulatory frameworks.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">4. Confidentiality &amp; Data Security</h3>
              <p>All information accessible through this Platform is classified as &ldquo;Strictly Confidential — Level 2 Institutional&rdquo;. You agree not to disclose, reproduce, distribute, or transmit any data from this Platform to any unauthorized party. You must immediately report any suspected security breach or unauthorized access to the Compliance Officer or IT Security team.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">5. Intellectual Property</h3>
              <p>The Platform and all its content, features, and functionality are owned by Springer Capital Group and are protected by applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to access the Platform solely for authorized internal business purposes.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">6. Audit &amp; Monitoring</h3>
              <p>All actions performed on this Platform are logged and subject to audit. Springer Capital Group reserves the right to monitor, review, and analyze Platform usage for compliance, security, and operational purposes. Audit logs are immutable and may be used in regulatory investigations or legal proceedings.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">7. Limitation of Liability</h3>
              <p>To the maximum extent permitted by applicable law, Springer Capital Group shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Platform. The Company&apos;s total liability shall not exceed the amount paid by you for access to the Platform in the preceding twelve (12) months.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">8. Termination</h3>
              <p>Springer Capital Group reserves the right to suspend or terminate your access to the Platform at any time, without notice, for violation of these Terms, regulatory requirements, or for any other business reason at the Company&apos;s sole discretion. Upon termination, all rights granted to you under these Terms will immediately cease.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">9. Governing Law</h3>
              <p>These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the state and federal courts located in New York County, New York.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">10. Contact &amp; Amendments</h3>
              <p>Springer Capital Group reserves the right to modify these Terms at any time. Continued use of the Platform after any modification constitutes your acceptance of the revised Terms. For questions regarding these Terms, please contact the Legal &amp; Compliance department at <span className="text-primary font-semibold">legal@springercapital.com</span>. Effective Date: September 7, 2026.</p>
            </div>

            <div className="pt-2 text-center text-[10px] text-muted-foreground/60 border-t border-border">
              — End of Terms &amp; Conditions —
            </div>
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="text-xs text-muted-foreground hover:text-[#54d0a2] hover:bg-[#062A20] px-3 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              Close
            </button>
            <Button
              type="button"
              onClick={handleAcceptTerms}
              disabled={!hasReadTerms}
              className={cn(
                "h-8 px-5 text-xs font-semibold rounded-md transition-all",
                hasReadTerms
                  ? "bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white shadow-xs hover:-translate-y-px cursor-pointer"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {hasReadTerms ? "✓ Accept & Continue" : "Scroll to bottom to accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
