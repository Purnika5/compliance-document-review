"use client";

/**
 * DOCU: Renders and manages the institutional personnel registration form.
 * Matches the reference design with Full Name, Corporate Email, Role selector, Passwords, and Terms.
 * Last Updated Date: September 15, 2026
 * @returns The institutional signup form view.
 * @author Keith
 */
import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  User,
  Mail,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();
  useRedirectIfAuthenticated();
  const { mutate, isPending, error, clearError } = useSignup();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Advisor" | "Officer">("Advisor");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleNameChange = (val: string) => {
    setName(val);
    setTouched((prev) => ({ ...prev, name: true }));
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
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
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
    setTouched((prev) => ({ ...prev, password: true }));
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
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
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
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormErrors({});

    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    const extraErrors: Record<string, string> = {};
    if (!acceptedTerms) {
      extraErrors.terms = "You must agree to the Terms of Service and Privacy Policy.";
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

    const registeredSession = await mutate({ name, email, password, confirmPassword, role });
    if (registeredSession) {
      router.push(registeredSession.role === "Officer" ? "/queue" : "/dashboard");
    }
  };

  return (
    <div className="w-full">
      {/* Mobile Brand Logo */}
      <div className="lg:hidden mb-6 flex justify-start">
        <CompanyLogo />
      </div>

      {/* Header */}
      <div className="space-y-1.5 mb-6 text-left">
        <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
          Create your institutional account
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your credentials to access the Springer Capital investor &amp; advisor portal
        </p>
      </div>

      {error && (
        <Alert
          variant="destructive"
          title="Registration Error"
          message={error}
          className="mb-5 p-3 text-xs bg-red-50 border-red-300 text-red-900 [&>svg]:text-red-600 [&>h5]:text-red-700"
        />
      )}

      <form id="signup-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Full Name Field */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              id="signup-name"
              placeholder="e.g. Eleanor Vance"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onPaste={() => markTouched("name")}
              onBlur={() => handleNameChange(name)}
              className={cn(
                "w-full h-11 pl-10 pr-9 rounded-lg border bg-white text-slate-900 text-sm placeholder:text-slate-400 transition-all outline-hidden focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800",
                touched.name && formErrors?.name
                  ? "border-rose-400 ring-1 ring-rose-400/50"
                  : touched.name && validFields?.name
                    ? "border-emerald-500 ring-1 ring-emerald-500/30"
                    : "border-slate-200"
              )}
            />
            {touched.name && validFields?.name && (
              <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 pointer-events-none" />
            )}
            {touched.name && formErrors?.name && (
              <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 pointer-events-none" />
            )}
          </div>
          {touched.name && formErrors?.name && (
            <p className="text-[11px] text-rose-500 font-medium">{formErrors.name}</p>
          )}
        </div>

        {/* Institutional / Corporate Email Field */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
            Institutional / Corporate Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="email"
              id="signup-email"
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
          {touched.email && formErrors?.email && (
            <p className="text-[11px] text-rose-500 font-medium">{formErrors.email}</p>
          )}
        </div>

        {/* Role Selector */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
            Role
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("Advisor")}
              className={cn(
                "h-11 px-4 rounded-lg border flex items-center gap-2.5 text-sm font-medium transition-all cursor-pointer",
                role === "Advisor"
                  ? "border-slate-900 bg-white text-slate-900 ring-1 ring-slate-900/10 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full border flex items-center justify-center transition-all",
                  role === "Advisor"
                    ? "border-slate-900"
                    : "border-slate-300"
                )}
              >
                {role === "Advisor" && (
                  <span className="h-2 w-2 rounded-full bg-slate-900" />
                )}
              </span>
              <span>Advisor</span>
            </button>

            <button
              type="button"
              onClick={() => setRole("Officer")}
              className={cn(
                "h-11 px-4 rounded-lg border flex items-center gap-2.5 text-sm font-medium transition-all cursor-pointer",
                role === "Officer"
                  ? "border-slate-900 bg-white text-slate-900 ring-1 ring-slate-900/10 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full border flex items-center justify-center transition-all",
                  role === "Officer"
                    ? "border-slate-900"
                    : "border-slate-300"
                )}
              >
                {role === "Officer" && (
                  <span className="h-2 w-2 rounded-full bg-slate-900" />
                )}
              </span>
              <span>Officer</span>
            </button>
          </div>
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
              id="signup-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onPaste={() => markTouched("password")}
              onBlur={() => handlePasswordChange(password)}
              className={cn(
                "w-full h-11 pl-10 pr-9 rounded-lg border bg-white text-slate-900 text-sm placeholder:text-slate-400 transition-all outline-hidden focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800",
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
          {touched.password && formErrors?.password && (
            <p className="text-[11px] text-rose-500 font-medium">{formErrors.password}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
            Confirm Password
          </label>
          <div className="relative">
            <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="signup-confirm-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              onPaste={() => markTouched("confirmPassword")}
              onBlur={() => handleConfirmPasswordChange(confirmPassword)}
              className={cn(
                "w-full h-11 pl-10 pr-9 rounded-lg border bg-white text-slate-900 text-sm placeholder:text-slate-400 transition-all outline-hidden focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800",
                touched.confirmPassword && formErrors?.confirmPassword
                  ? "border-rose-400 ring-1 ring-rose-400/50"
                  : touched.confirmPassword && validFields?.confirmPassword
                    ? "border-emerald-500 ring-1 ring-emerald-500/30"
                    : "border-slate-200"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {touched.confirmPassword && formErrors?.confirmPassword && (
            <p className="text-[11px] text-rose-500 font-medium">{formErrors.confirmPassword}</p>
          )}
        </div>

        {/* Terms and Privacy Checkbox */}
        <div className="pt-1 space-y-1 text-left">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="signup-terms-checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                if (!acceptedTerms) {
                  e.preventDefault();
                  setShowTermsModal(true);
                } else {
                  setAcceptedTerms(false);
                }
              }}
              className="h-4 w-4 rounded-sm border-slate-300 text-[#183028] focus:ring-[#183028] cursor-pointer accent-[#183028]"
            />
            <span className="text-xs text-slate-600 leading-snug">
              I agree to the{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowTermsModal(true);
                }}
                className="font-semibold text-slate-900 hover:underline cursor-pointer"
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowTermsModal(true);
                }}
                className="font-semibold text-slate-900 hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
            </span>
          </label>
          {formErrors.terms && (
            <p className="text-[11px] text-rose-500 font-medium pl-6.5">{formErrors.terms}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            form="signup-form"
            id="signup-submit"
            disabled={isPending}
            className="w-full bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] active:bg-[#10221c] text-white font-medium text-sm h-11 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/10 hover:shadow-lg disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (
              <span className="flex items-center gap-2 text-white">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Registering Account...
              </span>
            ) : (
              <>
                <span>Register for Institutional Access</span>
                <ArrowRight className="h-4 w-4 text-white" />
              </>
            )}
          </Button>
        </div>

        {/* Already Registered Link */}
        <div className="pt-3 text-center">
          <p className="text-xs text-slate-600">
            Already registered?{" "}
            <Link href="/login" className="font-bold text-slate-900 hover:underline inline-flex items-center gap-0.5">
              <span>Sign in</span>
              <span className="text-sm">→</span>
            </Link>
          </p>
        </div>
      </form>

      {/* Terms & Conditions Dialog */}
      <Dialog open={showTermsModal} onOpenChange={(open) => { if (hasReadTerms) setShowTermsModal(open); }}>
        <DialogContent
          className="max-w-lg p-0 overflow-hidden gap-0 bg-white text-slate-900 border border-slate-200 shadow-2xl [&>button:last-child]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => { if (!hasReadTerms) e.preventDefault(); }}
        >
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">Terms &amp; Conditions</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Springer Capital Institutional Platform Agreement
            </DialogDescription>
          </DialogHeader>

          <div
            ref={termsScrollRef}
            onScroll={handleTermsScroll}
            className="overflow-y-auto max-h-[320px] px-6 py-4 space-y-3.5 text-xs text-slate-600 leading-relaxed"
          >
            <p className="font-semibold text-slate-800">1. Acceptance of Terms</p>
            <p>
              By registering for and using the Springer Capital Institutional Compliance &amp; Document Review Platform, you agree to be bound by these Terms and Conditions.
            </p>
            <p className="font-semibold text-slate-800">2. Authorized Personnel Only</p>
            <p>
              Access to this Platform is strictly limited to authorized personnel of Springer Capital Group and institutional partner firms.
            </p>
            <p className="font-semibold text-slate-800">3. Regulatory Compliance</p>
            <p>
              All documents, investment models, and advisory materials submitted or reviewed are subject to applicable financial and fiduciary regulations.
            </p>
            <p className="font-semibold text-slate-800">4. Confidentiality</p>
            <p>
              Information within this portal is strictly confidential. Unauthorized copying or redistribution is strictly prohibited.
            </p>
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3">
            <Button
              type="button"
              onClick={handleAcceptTerms}
              disabled={!hasReadTerms}
              className="h-8 px-4 text-xs font-semibold rounded-md bg-[#132c20] hover:bg-[#183a2b] text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✓ Accept &amp; Agree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
