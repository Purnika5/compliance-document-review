"use client";

/**
 * DOCU: Compliance Action Journal & Onboarding Tracker for Springer Capital.
 * Automatically presents to first-time login or registered users with strictly role-differentiated actions.
 * Advisors receive submission & pre-scan actions; Officers receive supervisory queue & determination actions.
 * Last Updated Date: September 25, 2026
 * @author Keith
 */

import React, { useState, useEffect, useSyncExternalStore, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  Sparkles,
  ShieldCheck,
  UploadCloud,
  FileCheck2,
  History,
  Bot,
  ListOrdered,
  Filter,
  RotateCcw,
  ExternalLink,
  HelpCircle,
  Award,
} from "lucide-react";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { journalStore, type IJournalAction } from "@/lib/journal-store";
import { walkthroughStore } from "@/lib/walkthrough-store";
import { cn } from "@/lib/utils";
import { showSuccessToast, showInfoToast } from "@/components/ui/toast";

export function ComplianceJournal() {
  const router = useRouter();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const state = useSyncExternalStore(
    journalStore.subscribe,
    journalStore.getState,
    journalStore.getServerSnapshot
  );

  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<{ title: string; content: string } | null>(null);

  const isOfficer = session?.role === "Officer";
  const userIdentifier = session?.email || (session as any)?.userId || (session as any)?.id || "user";
  const role: "Advisor" | "Officer" = isOfficer ? "Officer" : "Advisor";

  const actions = journalStore.getActions(userIdentifier, role);
  const completedCount = actions.filter((a) => a.completed).length;
  const totalCount = actions.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isAllCompleted = completedCount === totalCount && totalCount > 0;

  const walkthroughState = useSyncExternalStore(
    walkthroughStore.subscribe,
    walkthroughStore.getState,
    walkthroughStore.getServerSnapshot
  );

  // First-time visit auto-open trigger (coordinates with Walkthrough so they never overlap)
  useEffect(() => {
    if (!session) return;

    // If the visual spotlight walkthrough is currently open, wait until it finishes
    if (walkthroughState.isOpen) return;

    // If the visual spotlight walkthrough has not yet completed for this user, wait for it
    const isWalkthroughPending = !walkthroughStore.hasCompleted(userIdentifier, role);
    if (isWalkthroughPending) return;

    if (hasAutoOpened) return;

    const isFirstTime = journalStore.isFirstTime(userIdentifier, role);
    if (isFirstTime) {
      const timer = setTimeout(() => {
        journalStore.openJournal(role);
        journalStore.markSeen(userIdentifier, role);
        setHasAutoOpened(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setHasAutoOpened(true);
    }
  }, [session, userIdentifier, role, hasAutoOpened, walkthroughState.isOpen]);

  const handleToggle = (actionId: string) => {
    journalStore.toggleAction(userIdentifier, role, actionId);
  };

  const handleExecuteAction = (action: IJournalAction) => {
    // Mark action as completed
    journalStore.completeAction(userIdentifier, role, action.id);

    switch (action.actionType) {
      case "acknowledge_rules":
        setSelectedStandard({
          title: isOfficer ? "FINRA Rule 3110 Supervisory Mandate" : "FINRA Rule 2210 & Rule 2111 Standards",
          content: isOfficer
            ? "Officers hold statutory supervisory jurisdiction over all investment recommendations, public correspondence, and advisory marketing materials. Every determination must be supported by audit documentation and statutory citations."
            : "Communications with the public must be fair, balanced, and complete. Promissory return statements, guaranteed performance assertions, and unsubstantiated rankings are strictly prohibited under FINRA Rule 2210(d)(1)(D).",
        });
        showSuccessToast("Statutory Guidelines Acknowledged", "Progress updated in your Compliance Journal.");
        break;

      case "upload_document":
        journalStore.closeJournal();
        // Route to dashboard and trigger upload button click if present
        router.push("/dashboard");
        setTimeout(() => {
          const uploadBtn = document.querySelector('[data-tour="advisor-upload"]') as HTMLButtonElement;
          if (uploadBtn) {
            uploadBtn.click();
          } else {
            showInfoToast("Upload Ready", "Click the '+ Upload Document' button to submit your draft.");
          }
        }, 300);
        break;

      case "copilot_grammar":
        journalStore.closeJournal();
        // Open copilot widget
        const copilotLauncher = document.querySelector('[data-tour="copilot-widget"] button') as HTMLButtonElement;
        if (copilotLauncher) {
          copilotLauncher.click();
        }
        showInfoToast(
          "Neural Copilot Active",
          isOfficer
            ? "Ask the Copilot: 'What are required disclosures under FINRA 2210?'"
            : "Type '/grammar The investment team have submited the proposal' to test sentence auditing."
        );
        break;

      case "view_queue":
        journalStore.closeJournal();
        router.push("/queue");
        showInfoToast("Review Queue", "Inspecting active filings awaiting supervisory determination.");
        break;

      case "review_priority":
        journalStore.closeJournal();
        router.push("/queue");
        showInfoToast("High Priority Filter", "Filtering submissions with potential statutory flags.");
        break;

      case "view_audit_trail":
        journalStore.closeJournal();
        router.push("/audit");
        showInfoToast("Audit Ledger", "Accessing permanent regulatory books and records ledger.");
        break;

      case "open_copilot_rules":
        setSelectedStandard({
          title: isOfficer ? "Statutory Determination Actions Protocol" : "Document Version Lineage Protocol",
          content: isOfficer
            ? "1. Approved: Filing satisfies FINRA 2210 & SEC 206. Record logged to ledger.\n2. Needs Revision: Specific citations provided to advisor. Advisor submits amended v2 without breaking lineage.\n3. Rejected: Unresolvable discrepancies. Record permanently archived."
            : "When revisions are requested by an officer, always upload amendments directly onto the existing document as version 2.0 (v2.0) rather than creating a new submission. This preserves statutory audit history.",
        });
        showSuccessToast("Protocol Acknowledged", "Action logged to your Compliance Journal.");
        break;

      default:
        showInfoToast("Action Recorded", "Milestone updated in your Compliance Journal.");
        break;
    }
  };

  const handleResetJournal = () => {
    journalStore.resetJournal(userIdentifier, role);
    showInfoToast("Journal Reset", "Onboarding action journal milestones have been reset.");
  };

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compliance Action Journal"
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl border border-[#E6E8E7] shadow-2xl overflow-hidden box-border text-[#183028] animate-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E8E7] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#183028] text-[#C5E86C] shadow-2xs">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#183028]">
                  Compliance Action Journal
                </h3>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    isOfficer
                      ? "bg-[#183028] text-[#C5E86C] border-[#183028]"
                      : "bg-[#C5E86C]/40 text-[#183028] border-[#b4db53]"
                  )}
                >
                  {isOfficer ? "Officer Supervisory Journal" : "Advisor Onboarding Journal"}
                </span>
              </div>
              <p className="text-[11px] text-[#183028]/60 mt-0.5 font-medium">
                {isOfficer
                  ? "First-time supervisory actions and regulatory determination milestones."
                  : "First-time submission guidance, automated PII pre-checks, and quality gates."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetJournal}
              className="p-1.5 rounded-lg text-[#183028]/50 hover:text-[#183028] hover:bg-[#E6E8E7]/60 transition-colors cursor-pointer"
              title="Reset Journal Milestones"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => journalStore.closeJournal()}
              className="p-1.5 rounded-lg text-[#183028]/50 hover:text-[#183028] hover:bg-[#E6E8E7]/60 transition-colors cursor-pointer"
              aria-label="Close Journal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Tracker Banner */}
        <div className="px-5 py-3 bg-[#FAFBFB] border-b border-[#E6E8E7] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#183028] flex items-center gap-1.5">
              {isAllCompleted ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-emerald-600" />
                  All Onboarding Milestones Completed!
                </span>
              ) : (
                <span>Onboarding Action Progress</span>
              )}
            </span>
            <span className="font-mono text-xs font-bold text-[#183028]">
              {completedCount} of {totalCount} completed ({progressPercent}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-[#E6E8E7] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isAllCompleted ? "bg-emerald-600" : "bg-[#183028]"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className={cn(
                "p-3.5 rounded-xl border transition-all shadow-2xs space-y-2 select-text",
                action.completed
                  ? "bg-emerald-50/40 border-emerald-200"
                  : "bg-white border-[#E6E8E7] hover:border-[#183028]/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(action.id)}
                    className="mt-0.5 text-[#183028] hover:text-emerald-700 transition-colors cursor-pointer shrink-0"
                    title={action.completed ? "Mark uncompleted" : "Mark completed"}
                  >
                    {action.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-[#183028]/30 hover:text-[#183028]/60" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={cn(
                          "text-xs font-bold text-[#183028]",
                          action.completed && "line-through text-[#183028]/60"
                        )}
                      >
                        {action.title}
                      </h4>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {action.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#183028]/75 mt-1 leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </div>

                {/* Take Action Button */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction(action)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer",
                    action.completed
                      ? "bg-white border border-[#E6E8E7] text-[#183028]/70 hover:bg-slate-50"
                      : "bg-[#183028] hover:bg-[#203f35] text-[#C5E86C]"
                  )}
                >
                  <span>{action.actionLabel}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Statutory Footnote */}
              <div className="flex items-center justify-between text-[10px] text-[#183028]/50 pt-1 border-t border-[#E6E8E7]/60 font-mono">
                <span>Rule Reference: {action.statutoryReference}</span>
                {action.completedAt && (
                  <span className="text-emerald-700 font-semibold font-sans">
                    ✓ Completed {new Date(action.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E6E8E7] bg-white">
          <span className="text-[11px] text-[#183028]/60 font-medium">
            💡 Onboarding milestones are stored per user account and role.
          </span>
          <button
            type="button"
            onClick={() => journalStore.closeJournal()}
            className="px-4 py-1.5 rounded-lg bg-[#183028] hover:bg-[#203f35] text-[#C5E86C] text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Close Journal
          </button>
        </div>
      </div>

      {/* Embedded Statutory Standards Dialog */}
      {selectedStandard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E6E8E7] shadow-2xl p-5 space-y-3 text-[#183028]">
            <div className="flex items-center justify-between border-b border-[#E6E8E7] pb-2.5">
              <h4 className="text-xs font-bold text-[#183028] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {selectedStandard.title}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedStandard(null)}
                className="p-1 rounded text-[#183028]/50 hover:text-[#183028]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[#183028]/80 leading-relaxed whitespace-pre-line">
              {selectedStandard.content}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStandard(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#183028] text-[#C5E86C] text-xs font-bold"
              >
                Acknowledge &amp; Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
