"use client";

/**
 * DOCU: Renders the Account & Preferences page for Springer Capital users.
 * Last Updated Date: September 8, 2026
 * @returns The account and preferences view.
 * @author Keith
 */
import React, { useState, useSyncExternalStore } from "react";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Shield,
  Key,
  Bell,
  Sliders,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Building,
  Smartphone,
  Sparkles,
  Save,
  AlertCircle,
  FileBadge,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const role = session?.role || "Advisor";
  const isOfficer = role === "Officer";

  // Form states initialized from authenticated session
  const [fullName, setFullName] = useState(session?.name || "");
  const [email, setEmail] = useState(session?.email || "");
  const [title, setTitle] = useState(isOfficer ? "Compliance Officer" : "Wealth Advisor");
  const [phone, setPhone] = useState("");

  // Preference toggles
  const [sensitivity, setSensitivity] = useState<"strict" | "balanced" | "throughput">("strict");
  const [autoEnforceDisclaimers, setAutoEnforceDisclaimers] = useState(true);
  const [urgentSmsAlerts, setUrgentSmsAlerts] = useState(true);
  const [revisionPushAlerts, setRevisionPushAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [soundFeedback, setSoundFeedback] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);

  // Form feedback state
  const [validationErrors, setValidationErrors] = useState<{ fullName?: string; email?: string }>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { fullName?: string; email?: string } = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required for regulatory audit signatures.";
    }

    if (!email.trim()) {
      errors.email = "Institutional email address is required.";
    } else if (!email.includes("@") || !email.includes(".")) {
      errors.email = "Please enter a valid corporate email address.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    if (session) {
      authStore.setSession({
        ...session,
        name: fullName,
        email: email,
      });
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 4500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-14">
      {/* Header Banner */}
      <div className="border border-border bg-card/80 backdrop-blur-md rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "chip border text-[10px] font-bold uppercase tracking-wider",
                isOfficer
                  ? "bg-cyan-950/60 text-cyan-300 border-cyan-800/50"
                  : "bg-emerald-950/60 text-emerald-300 border-emerald-800/50"
              )}
            >
              <ShieldCheck className="h-3 w-3 inline mr-1" />
              {role} Workspace
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Account &amp; Preferences
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage your Springer Capital institutional identity, digital signature credentials, and review preferences.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 text-xs rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Institutional account and compliance preferences saved successfully.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSavePreferences} noValidate className="space-y-6">
        {/* Profile & Credentials Section */}
        <div className="border border-border bg-card rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Institutional Profile &amp; Regulatory Credentials
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Legal Full Name <span className="text-rose-400">*</span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (validationErrors.fullName) {
                    setValidationErrors((prev) => ({ ...prev, fullName: undefined }));
                  }
                }}
                className={cn(
                  "h-9 text-xs bg-background/60",
                  validationErrors.fullName && "border-rose-500 focus-visible:ring-rose-500"
                )}
                placeholder="e.g. Alex Smith"
              />
              {validationErrors.fullName && (
                <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{validationErrors.fullName}</span>
                </div>
              )}
            </div>

            {/* Corporate Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Institutional Email <span className="text-rose-400">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) {
                    setValidationErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                className={cn(
                  "h-9 text-xs bg-background/60",
                  validationErrors.email && "border-rose-500 focus-visible:ring-rose-500"
                )}
                placeholder="name@springercapital.com"
              />
              {validationErrors.email && (
                <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{validationErrors.email}</span>
                </div>
              )}
            </div>

            {/* Job Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Corporate Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs bg-background/60"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Direct Desk Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs bg-background/60"
              />
            </div>
          </div>

          {/* Institutional Badges Card */}
          <div className="p-3 bg-muted/30 border border-border/70 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Session Role
              </span>
              <span className="font-mono font-bold text-foreground">
                {role}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Account Status
              </span>
              <span className="font-semibold text-emerald-400">
                Active &amp; Authenticated
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Institutional Email
              </span>
              <span className="font-mono text-muted-foreground text-[11px] truncate block">
                {session?.email || "Not provided"}
              </span>
            </div>
          </div>
        </div>

        {/* Compliance & AI Evaluation Engine Preferences */}
        <div className="border border-border bg-card rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              AI Compliance Engine &amp; Rule Preferences
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Automated Rule Sensitivity Threshold
              </label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Controls the rigor of AI promissory statement and disclosure scanning against FINRA Rule 2210 &amp; SEC Rule 206(4)-1.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSensitivity("strict")}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer",
                    sensitivity === "strict"
                      ? "bg-[#062a20] border-emerald-800/60 text-foreground shadow-xs"
                      : "bg-transparent border-border text-muted-foreground hover:bg-[#062a20]/60 hover:text-[#54d0a2]"
                  )}
                >
                  <div className="flex items-center justify-between font-semibold text-xs text-foreground mb-0.5">
                    <span>Strict Institutional</span>
                    {sensitivity === "strict" && <CheckCircle2 className="h-3.5 w-3.5 text-[#54d0a2]" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Zero tolerance for promissory or unhedged claims. Recommended for public offerings.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSensitivity("balanced")}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer",
                    sensitivity === "balanced"
                      ? "bg-[#062a20] border-emerald-800/60 text-foreground shadow-xs"
                      : "bg-transparent border-border text-muted-foreground hover:bg-[#062a20]/60 hover:text-[#54d0a2]"
                  )}
                >
                  <div className="flex items-center justify-between font-semibold text-xs text-foreground mb-0.5">
                    <span>Balanced Advisory</span>
                    {sensitivity === "balanced" && <CheckCircle2 className="h-3.5 w-3.5 text-[#54d0a2]" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Standard FINRA threshold with contextual performance attribution.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSensitivity("throughput")}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer",
                    sensitivity === "throughput"
                      ? "bg-[#062a20] border-emerald-800/60 text-foreground shadow-xs"
                      : "bg-transparent border-border text-muted-foreground hover:bg-[#062a20]/60 hover:text-[#54d0a2]"
                  )}
                >
                  <div className="flex items-center justify-between font-semibold text-xs text-foreground mb-0.5">
                    <span>Internal Review Only</span>
                    {sensitivity === "throughput" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Flags high-severity violations only. For internal brainstorming drafts.
                  </p>
                </button>
              </div>
            </div>

            {/* Mandatory Disclaimers toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Mandatory Disclaimer Auto-Attachment
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Automatically attaches Springer Capital standard SEC/FINRA footnotes to approved decks.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoEnforceDisclaimers}
                onChange={(e) => setAutoEnforceDisclaimers(e.target.checked)}
                className="h-4 w-4 rounded accent-primary border-border bg-background cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Session Security & Authentication Section */}
        <div className="border border-border bg-card rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Session Security &amp; Authorization
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Bearer Token Authentication</p>
                <p className="text-[11px] text-muted-foreground">
                  JSON Web Token session verified against the Springer Capital REST API.
                </p>
              </div>
              <span className="chip bg-emerald-950/60 text-emerald-300 border-emerald-800/50 text-[10px] font-bold">
                Authenticated
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <p className="text-xs font-semibold text-foreground">Role Privileges</p>
                <p className="text-[11px] text-muted-foreground">
                  Access controlled by verified {role} authorization scope.
                </p>
              </div>
              <span className="chip bg-muted/60 text-muted-foreground border-border text-[10px] font-mono">
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="border border-border bg-card rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Alerts &amp; Notification Preferences
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Urgent Compliance SLA Alerts</p>
                <p className="text-[11px] text-muted-foreground">
                  Receive high-priority SMS and in-app alert when review SLA drops under 24 hours.
                </p>
              </div>
              <input
                type="checkbox"
                checked={urgentSmsAlerts}
                onChange={(e) => setUrgentSmsAlerts(e.target.checked)}
                className="h-4 w-4 rounded accent-primary border-border bg-background cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <p className="text-xs font-semibold text-foreground">Revision Thread Activity</p>
                <p className="text-[11px] text-muted-foreground">
                  Notify instantly when an advisor re-submits a revised deck or post questions.
                </p>
              </div>
              <input
                type="checkbox"
                checked={revisionPushAlerts}
                onChange={(e) => setRevisionPushAlerts(e.target.checked)}
                className="h-4 w-4 rounded accent-primary border-border bg-background cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <p className="text-xs font-semibold text-foreground">Daily Compliance Digest</p>
                <p className="text-[11px] text-muted-foreground">
                  08:00 EST daily morning summary of all pending queue items and approval statistics.
                </p>
              </div>
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                className="h-4 w-4 rounded accent-primary border-border bg-background cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            size="sm"
            className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white transition-all"
          >
            <Save className="h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
