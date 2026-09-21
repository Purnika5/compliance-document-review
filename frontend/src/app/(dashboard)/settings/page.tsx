"use client";

/**
 * DOCU: Renders the Account & Preferences page for Springer Capital users.
 * Last Updated Date: September 17, 2026
 * @returns The account and preferences view.
 * @author Keith
 */
import React, { useState, useEffect, useSyncExternalStore } from "react";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  CheckCircle2,
  Save,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsSkeleton } from "@/features/settings/components/settings-skeleton";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const role = session?.role || "Advisor";

  // Form states initialized from authenticated session
  const [fullName, setFullName] = useState(session?.name || "");
  const [email, setEmail] = useState(session?.email || "");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setMounted(true);
    if (session?.name && !fullName) setFullName(session.name);
    if (session?.email) setEmail(session.email);
  }, [session]);

  // Form feedback state
  const [validationErrors, setValidationErrors] = useState<{ fullName?: string }>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!mounted) {
    return <SettingsSkeleton />;
  }

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { fullName?: string } = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required for regulatory audit signatures.";
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
      });
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 4500);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="border border-[#E6E8E7] bg-[#FFFFFF] rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#183028]">
            Account &amp; Preferences
          </h1>
          <p className="text-xs sm:text-sm text-[#183028]/65 mt-1">
            Manage your Springer Capital institutional identity, digital signature credentials, and contact details.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">Institutional account profile and preferences saved successfully.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSavePreferences} noValidate className="space-y-4">
        {/* Profile & Credentials Section */}
        <div className="border border-[#E6E8E7] bg-[#FFFFFF] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6E8E7]">
            <div className="h-8 w-8 rounded-lg bg-[#E6E8E7] text-[#183028] border border-[#E6E8E7] flex items-center justify-center shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#183028]">
                Institutional Profile &amp; Regulatory Credentials
              </h2>
              <p className="text-xs text-[#183028]/65 mt-0.5">
                Primary user profile details used for compliance audit logs and submission attestation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#183028]">
                Legal Full Name <span className="text-rose-500">*</span>
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
                  "h-9 text-xs bg-[#FFFFFF] border-[#E6E8E7] text-[#183028] rounded-xl focus:border-[#183028] focus:ring-1 focus:ring-[#183028] shadow-2xs",
                  validationErrors.fullName && "border-rose-500 focus-visible:ring-rose-500"
                )}
                placeholder="e.g. Alex Smith"
              />
              {validationErrors.fullName && (
                <div className="flex items-center gap-1 text-[11px] text-rose-600 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{validationErrors.fullName}</span>
                </div>
              )}
            </div>

            {/* Corporate Email (Read Only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#183028]">
                Institutional Email
              </label>
              <Input
                type="email"
                value={session?.email || email}
                readOnly
                className="h-9 text-xs bg-[#FAFBFB] border-[#E6E8E7] text-[#183028]/70 rounded-xl shadow-2xs cursor-not-allowed select-none focus-visible:ring-0 focus-visible:border-[#E6E8E7]"
                placeholder="name@springer.capital"
              />
            </div>

            {/* Role (Read Only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#183028]">Role</label>
              <Input
                value={role}
                readOnly
                className="h-9 text-xs bg-[#FAFBFB] border-[#E6E8E7] text-[#183028]/70 rounded-xl shadow-2xs cursor-not-allowed select-none focus-visible:ring-0 focus-visible:border-[#E6E8E7]"
                placeholder="Role"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#183028]">Direct Desk Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs bg-[#FFFFFF] border-[#E6E8E7] text-[#183028] rounded-xl focus:border-[#183028] focus:ring-1 focus:ring-[#183028] shadow-2xs"
                placeholder="+1 (212) 555-0190"
              />
            </div>
          </div>
        </div>

        {/* Action Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            size="sm"
            className="h-9 px-5 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] active:bg-[#10221c] text-white rounded-xl transition-all"
          >
            <Save className="h-3.5 w-3.5" />
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
