"use client";

/**
 * DOCU: Renders and manages the personnel registration form.
 * Last Updated Date: September 7, 2026
 * @returns The signup form view.
 * @author Keith
 */
import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSignup } from "../hooks/use-signup";
import { useRedirectIfAuthenticated } from "../hooks/use-auth-guard";
import { signupSchema } from "@/lib/validation/auth";
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
import { User, Mail, Lock, ShieldCheck, Briefcase, Eye, EyeOff, Loader2, Shield, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DOCU: Renders the signup form and processes personnel registration.
 * Last Updated Date: September 7, 2026
 * @returns The signup form component.
 * @author Keith
 */
export function SignupForm() {
  useRedirectIfAuthenticated();
  const { mutate, isPending, error, clearError } = useSignup();

  const [name, setName]                         = useState("");
  const [email, setEmail]                       = useState("");
  const [password, setPassword]                 = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole]                         = useState<"Advisor" | "Officer">("Advisor");
  const [acceptedTerms, setAcceptedTerms]       = useState(false);
  const [showTermsModal, setShowTermsModal]     = useState(false);
  const [hasReadTerms, setHasReadTerms]         = useState(false);
  const [isNotRobot, setIsNotRobot]             = useState(false);
  const [formErrors, setFormErrors]             = useState<Record<string, string>>({});
  const termsScrollRef = useRef<HTMLDivElement>(null);

  /**
   * DOCU: Clears a single field's validation error on user interaction.
   * Last Updated Date: September 7, 2026
   * @param field - The field key to remove from formErrors.
   * @author Keith
   */
  const clearFieldError = (field: string) =>
    setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });

  /**
   * DOCU: Tracks scroll position inside the T&C modal to auto-accept when bottom is reached.
   * Last Updated Date: September 7, 2026
   * @author Keith
   */
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

  /**
   * DOCU: Calculates password strength score 0–4.
   * Last Updated Date: September 7, 2026
   * @param pwd - Raw password string.
   * @returns Numeric strength score.
   * @author Keith
   */
  const getPasswordStrength = (pwd: string): number => {
    let score = 0;
    if (pwd.length >= 8)          score++;
    if (/[A-Z]/.test(pwd))        score++;
    if (/[0-9]/.test(pwd))        score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strengthScore];
  const strengthColor = [
    "",
    "bg-rose-500",
    "bg-amber-400",
    "bg-yellow-400",
    "bg-emerald-500",
  ][strengthScore];

  /**
   * DOCU: Handles signup form submission with schema validation.
   * Last Updated Date: September 7, 2026
   * @param e - Form submission event.
   * @returns Void promise.
   * @author Keith
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormErrors({});

    const extraErrors: Record<string, string> = {};
    if (!acceptedTerms) extraErrors.terms    = "You must accept the Terms & Conditions to continue.";
    if (!isNotRobot)    extraErrors.captcha  = "Please confirm you are not a robot.";

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

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="neu-surface rounded-xl overflow-hidden border-white/70">

        {/* Gradient accent strip */}
        <div className="h-[3px] bg-gradient-to-r from-[hsl(239_72%_52%)] via-[hsl(190_80%_55%)] to-[hsl(326_72%_61%)]" />

        <CardHeader className="text-center space-y-1 pb-4 pt-6">
          <CompanyLogo className="justify-center" />
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
              className="alert-strip-error animate-slide-down"
            />
          )}

          <form id="signup-form" onSubmit={handleSubmit} noValidate className="space-y-3.5">

            {/* Full Name */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  id="signup-name"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                  className={cn(
                    "neu-inset pl-9 h-9 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-ring transition-shadow",
                    formErrors?.name && "ring-1 ring-rose-400"
                  )}
                />
              </div>
              {formErrors?.name && (
                <p className="text-[11px] text-rose-600 font-medium animate-fade-in">{formErrors.name}</p>
              )}
            </div>

            {/* Work Email */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  type="email"
                  id="signup-email"
                  placeholder="name@springercapital.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                  className={cn(
                    "neu-inset pl-9 h-9 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-ring transition-shadow",
                    formErrors?.email && "ring-1 ring-rose-400"
                  )}
                />
              </div>
              {formErrors?.email && (
                <p className="text-[11px] text-rose-600 font-medium animate-fade-in">{formErrors.email}</p>
              )}
            </div>

            {/* Access Role */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Access Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="role-advisor"
                  onClick={() => { setRole("Advisor"); clearFieldError("role"); }}
                  className={cn(
                    "p-2.5 rounded-md border text-left flex items-start space-x-2 transition-all cursor-pointer",
                    role === "Advisor"
                      ? "border-primary bg-blue-50 shadow-inner border-l-[3px] border-l-primary"
                      : "border-slate-200 bg-background hover:bg-blue-50/60 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <Briefcase className={cn("h-4 w-4 shrink-0 mt-0.5", role === "Advisor" ? "text-primary" : "text-slate-500")} />
                  <div>
                    <p className={cn("text-xs font-bold leading-tight", role === "Advisor" ? "text-primary" : "text-slate-900")}>Advisor</p>
                    <p className="text-[10px] text-slate-500 font-normal">Submits documents</p>
                  </div>
                </button>

                <button
                  type="button"
                  id="role-officer"
                  onClick={() => { setRole("Officer"); clearFieldError("role"); }}
                  className={cn(
                    "p-2.5 rounded-md border text-left flex items-start space-x-2 transition-all cursor-pointer",
                    role === "Officer"
                      ? "border-slate-700 bg-slate-900/5 shadow-inner border-l-[3px] border-l-slate-800"
                      : "border-slate-200 bg-background hover:bg-slate-50 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <ShieldCheck className={cn("h-4 w-4 shrink-0 mt-0.5", role === "Officer" ? "text-slate-800" : "text-slate-500")} />
                  <div>
                    <p className={cn("text-xs font-bold leading-tight", role === "Officer" ? "text-slate-900" : "text-slate-900")}>Officer</p>
                    <p className="text-[10px] text-slate-500 font-normal">Reviews &amp; approves</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Create Password */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  id="signup-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                  className={cn(
                    "neu-inset pl-9 pr-9 h-9 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-ring transition-shadow",
                    formErrors?.password && "ring-1 ring-rose-400"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="space-y-1 animate-fade-in">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((segment) => (
                      <div
                        key={segment}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all duration-300",
                          strengthScore >= segment ? strengthColor : "bg-slate-200"
                        )}
                      />
                    ))}
                  </div>
                  {strengthLabel && (
                    <p className={cn(
                      "text-[10px] font-semibold",
                      strengthScore <= 1 ? "text-rose-600" :
                      strengthScore === 2 ? "text-amber-600" :
                      strengthScore === 3 ? "text-yellow-600" :
                      "text-emerald-600"
                    )}>
                      {strengthLabel} password
                    </p>
                  )}
                </div>
              )}

              {formErrors?.password && (
                <p className="text-[11px] text-rose-600 font-medium animate-fade-in">{formErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  id="signup-confirm-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
                  className={cn(
                    "neu-inset pl-9 pr-9 h-9 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-ring transition-shadow",
                    formErrors?.confirmPassword && "ring-1 ring-rose-400"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {formErrors?.confirmPassword && (
                <p className="text-[11px] text-rose-600 font-medium animate-fade-in">{formErrors.confirmPassword}</p>
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
                    ? "border-primary/40 bg-primary/5"
                    : formErrors.terms
                    ? "border-rose-300 bg-rose-50/60"
                    : "border-slate-200 bg-background hover:border-primary/30 hover:bg-primary/[0.03]"
                )}
              >
                {/* Custom checkbox display */}
                <div
                  className={cn(
                    "h-4 w-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                    acceptedTerms
                      ? "bg-primary border-primary"
                      : formErrors.terms
                      ? "border-rose-400 bg-white"
                      : "border-slate-300 bg-white group-hover:border-primary/50"
                  )}
                >
                  {acceptedTerms && (
                    <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 leading-snug">
                    I agree to the{" "}
                    <span className="text-primary font-bold group-hover:underline">Terms &amp; Conditions</span>
                    {" "}&amp;{" "}
                    <span className="text-primary font-bold group-hover:underline">Privacy Policy</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {acceptedTerms ? (
                      <span className="text-emerald-600 font-semibold">✓ Read &amp; accepted</span>
                    ) : (
                      "Click to read and accept the full terms"
                    )}
                  </p>
                </div>

                {/* Arrow indicator */}
                {!acceptedTerms && (
                  <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {formErrors.terms && (
                <p className="text-[11px] text-rose-600 font-medium animate-fade-in flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                  {formErrors.terms}
                </p>
              )}
            </div>

            {/* ── Dummy reCAPTCHA ───────────────────────────── */}
            <div className="space-y-1">
              <label
                htmlFor="signup-robot"
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  isNotRobot
                    ? "border-emerald-300 bg-emerald-50/60"
                    : formErrors.captcha
                    ? "border-rose-300 bg-rose-50/60"
                    : "border-slate-200 bg-background hover:border-slate-300 hover:bg-slate-50/60"
                )}
              >
                {/* Checkbox */}
                <div className="relative flex items-center justify-center shrink-0">
                  <input
                    id="signup-robot"
                    type="checkbox"
                    checked={isNotRobot}
                    onChange={(e) => {
                      setIsNotRobot(e.target.checked);
                      if (e.target.checked) setFormErrors((prev) => { const n = {...prev}; delete n.captcha; return n; });
                    }}
                    className="sr-only"
                    aria-required="true"
                  />
                  <div
                    className={cn(
                      "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                      isNotRobot
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-400 bg-white"
                    )}
                  >
                    {isNotRobot && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Label */}
                <span className="flex-1 text-xs font-semibold text-slate-800">I&apos;m not a robot</span>

                {/* reCAPTCHA branding mock */}
                <div className="shrink-0 flex flex-col items-center gap-0.5 opacity-70">
                  <div className="h-8 w-8 rounded">
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                      <circle cx="32" cy="32" r="30" stroke="#4A90D9" strokeWidth="4" />
                      <path d="M20 32c0-6.627 5.373-12 12-12s12 5.373 12 12-5.373 12-12 12" stroke="#4A90D9" strokeWidth="3" strokeLinecap="round" />
                      <path d="M32 20l4 4-4 4" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[8px] font-bold text-slate-500 leading-none">reCAPTCHA</span>
                  <span className="text-[7px] text-slate-400 leading-none">Privacy · Terms</span>
                </div>
              </label>
              {formErrors.captcha && (
                <p className="text-[11px] text-rose-600 font-medium animate-fade-in flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                  {formErrors.captcha}
                </p>
              )}
            </div>

          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2 pb-6 border-t border-white/60 bg-background/40">
          <Button
            type="submit"
            form="signup-form"
            id="signup-submit"
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-9 rounded-md transition-all hover:-translate-y-px hover:shadow-md disabled:opacity-60 disabled:translate-y-0"
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

          <p className="text-xs text-slate-500 text-center">
            Already registered?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* ── Terms & Conditions Modal ─────────────────────────────────── */}
      <Dialog open={showTermsModal} onOpenChange={(open) => { if (open) setShowTermsModal(true); }}>
        <DialogContent className="max-w-lg neu-surface p-0 overflow-hidden gap-0 [&>button:last-of-type]:hidden">

          {/* Gradient accent strip */}
          <div className="h-[3px] bg-gradient-to-r from-[hsl(239_72%_52%)] via-[hsl(190_80%_55%)] to-[hsl(326_72%_61%)]" />

          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">Terms &amp; Conditions</DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500 mt-0.5">
                  Springer Capital Institutional Platform — Please read in full
                </DialogDescription>
              </div>
            </div>

            {/* Scroll progress hint */}
            {!hasReadTerms && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 animate-fade-in">
                <svg className="h-3.5 w-3.5 text-amber-600 shrink-0 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <p className="text-[11px] text-amber-800 font-semibold">
                  Scroll to the bottom to accept
                </p>
              </div>
            )}
            {hasReadTerms && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 animate-fade-in">
                <svg className="h-3.5 w-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-[11px] text-emerald-800 font-semibold">
                  You&apos;ve read the full terms — agreement auto-accepted!
                </p>
              </div>
            )}
          </DialogHeader>

          {/* Scrollable T&C Content */}
          <div
            ref={termsScrollRef}
            onScroll={handleTermsScroll}
            className="overflow-y-auto max-h-[340px] px-5 py-4 space-y-4 text-xs text-slate-700 leading-relaxed"
          >
            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">1. Acceptance of Terms</h3>
              <p>By registering for and using the Springer Capital Institutional Compliance &amp; Wealth Advisory Platform (&ldquo;Platform&rdquo;), you agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;). These Terms constitute a legally binding agreement between you and Springer Capital Group (&ldquo;Company&rdquo;). If you do not agree to all of these Terms, do not access or use the Platform.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">2. Authorized Personnel Only</h3>
              <p>Access to this Platform is strictly limited to authorized personnel of Springer Capital Group. Each account is personal and non-transferable. You are solely responsible for maintaining the confidentiality of your login credentials. Any activity conducted under your account shall be deemed to have been authorized by you. Unauthorized access or use is strictly prohibited and may result in civil and criminal penalties.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">3. Compliance Obligations</h3>
              <p>All documents, records, and data submitted or reviewed through this Platform are subject to applicable financial regulations including but not limited to FINRA Rule 2111, SEC Rule 17a-4, and the Dodd-Frank Wall Street Reform and Consumer Protection Act. Personnel must ensure that all submissions are accurate, complete, and compliant with applicable regulatory frameworks.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">4. Confidentiality &amp; Data Security</h3>
              <p>All information accessible through this Platform is classified as &ldquo;Strictly Confidential — Level 2 Institutional&rdquo;. You agree not to disclose, reproduce, distribute, or transmit any data from this Platform to any unauthorized party. You must immediately report any suspected security breach or unauthorized access to the Compliance Officer or IT Security team.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">5. Intellectual Property</h3>
              <p>The Platform and all its content, features, and functionality are owned by Springer Capital Group and are protected by applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to access the Platform solely for authorized internal business purposes.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">6. Audit &amp; Monitoring</h3>
              <p>All actions performed on this Platform are logged and subject to audit. Springer Capital Group reserves the right to monitor, review, and analyze Platform usage for compliance, security, and operational purposes. Audit logs are immutable and may be used in regulatory investigations or legal proceedings.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">7. Limitation of Liability</h3>
              <p>To the maximum extent permitted by applicable law, Springer Capital Group shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Platform. The Company&apos;s total liability shall not exceed the amount paid by you for access to the Platform in the preceding twelve (12) months.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">8. Termination</h3>
              <p>Springer Capital Group reserves the right to suspend or terminate your access to the Platform at any time, without notice, for violation of these Terms, regulatory requirements, or for any other business reason at the Company&apos;s sole discretion. Upon termination, all rights granted to you under these Terms will immediately cease.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">9. Governing Law</h3>
              <p>These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the state and federal courts located in New York County, New York.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">10. Contact &amp; Amendments</h3>
              <p>Springer Capital Group reserves the right to modify these Terms at any time. Continued use of the Platform after any modification constitutes your acceptance of the revised Terms. For questions regarding these Terms, please contact the Legal &amp; Compliance department at <span className="text-primary font-semibold">legal@springercapital.com</span>. Effective Date: September 7, 2026.</p>
            </div>

            {/* Scroll anchor sentinel */}
            <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-100">
              — End of Terms &amp; Conditions —
            </div>
          </div>

          <DialogFooter className="px-5 py-4 border-t border-slate-100 bg-background/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
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
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:-translate-y-px"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
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

