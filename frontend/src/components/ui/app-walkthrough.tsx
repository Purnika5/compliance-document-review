"use client";

/**
 * DOCU: Interactive Onboarding Walkthrough for Springer Capital Compliance Platform.
 * Automatically initiates only on first-time login/visit for both Advisors and Officers.
 * Features role-tailored workflow guides, interactive mock previews, and statutory compliance highlights.
 * Last Updated Date: September 25, 2026
 * @author Keith
 */

import React, { useState, useEffect, useSyncExternalStore, useCallback } from "react";
import {
  Sparkles,
  ShieldCheck,
  UploadCloud,
  FileCheck2,
  Layers,
  History,
  Bot,
  ListOrdered,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  FileText,
  AlertTriangle,
  Lock,
  Download,
  Search,
  Check,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { walkthroughStore } from "@/lib/walkthrough-store";
import { cn } from "@/lib/utils";

interface IWalkthroughStep {
  title: string;
  badge: string;
  headline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  proTip: string;
  previewType: "welcome" | "upload_pii" | "versioning" | "audit_trail" | "copilot" | "queue" | "audit_workspace" | "determinations";
}

const ADVISOR_STEPS: IWalkthroughStep[] = [
  {
    title: "Welcome to Advisor Portal",
    badge: "Advisor Workspace",
    headline: "Institutional Advisory Compliance & Submission",
    description:
      "Prepare, pre-scan, and submit client recommendation correspondence, retirement strategies, and marketing materials. Every draft is automatically audited against FINRA Rule 2210 & SEC Rule 206 standards.",
    icon: Sparkles,
    proTip: "Automated pre-scans run instantly on upload to highlight potential promissory claims before supervisory review.",
    previewType: "welcome",
  },
  {
    title: "Draft Submission & PII Masking",
    badge: "Step 2: Submissions",
    headline: "Uploading Documents & Automated Redaction",
    description:
      "Submit drafts in .pdf, .docx, or .txt format. Springer Capital's secure ingestion pipeline automatically detects and masks confidential client PII (SSNs, phone numbers, account numbers) before permanent ledger storage.",
    icon: UploadCloud,
    proTip: "Client identities are converted into secure audit tokens (e.g., [SSN_MASKED]) for complete data confidentiality.",
    previewType: "upload_pii",
  },
  {
    title: "Status Workflow & Revisions",
    badge: "Step 3: Lineage & Versions",
    headline: "Tracking Review Cycles & Versioning",
    description:
      "Track submissions through 'Pending Review', 'Needs Revision', or 'Approved'. If an officer requests amendments, upload revised drafts (v2, v3) while preserving complete audit lineage and review history.",
    icon: Layers,
    proTip: "Clean remediated files can be downloaded directly from the review workspace with internal audit notes removed.",
    previewType: "versioning",
  },
  {
    title: "Permanent Audit Trail",
    badge: "Step 4: Audit Defensibility",
    headline: "Immutable Supervisory Ledger",
    description:
      "Every document event, status transition, timestamp, and officer determination is permanently logged to the compliance ledger, ensuring complete books and records audit defensibility.",
    icon: History,
    proTip: "View full supervisory notes and lifecycle audit logs anytime from the Audit Trail tab.",
    previewType: "audit_trail",
  },
  {
    title: "Neural Compliance Copilot",
    badge: "Step 5: Embedded AI",
    headline: "AI-Powered Pre-Checking & Polish",
    description:
      "Click the Copilot widget in the bottom-right corner anytime! Use /grammar to check sentence quality and verify English dictionary words, /enhance to format memos, or /rules to look up FINRA & SEC guidelines.",
    icon: Bot,
    proTip: "Type '/grammar <sentence>' to test phrasing for promissory language and grammatical syntax before submitting.",
    previewType: "copilot",
  },
];

const OFFICER_STEPS: IWalkthroughStep[] = [
  {
    title: "Supervisory Console",
    badge: "Officer Supervisory Console",
    headline: "Welcome, Compliance Supervisory Officer",
    description:
      "Your centralized command center for reviewing advisory correspondence, supervising suitability under FINRA Rule 2111, and executing statutory compliance determinations under FINRA Rule 2210 & SEC Rule 206.",
    icon: ShieldCheck,
    proTip: "Officers hold final determinative authority across all advisory submissions and marketing filings.",
    previewType: "welcome",
  },
  {
    title: "Review Queue & Triage",
    badge: "Step 2: Review Queue",
    headline: "Incoming Filings & Priority Risk Triage",
    description:
      "The Review Queue organizes incoming filings by submission date, filing type, and risk severity (High, Medium, Low). Quickly prioritize urgent reviews and inspect multi-version submissions.",
    icon: ListOrdered,
    proTip: "Filter by 'High' severity to prioritize filings with promissory return claims or missing downside disclosures.",
    previewType: "queue",
  },
  {
    title: "Audit Workspace & Citations",
    badge: "Step 3: Document Workspace",
    headline: "Side-by-Side Review & Rule Citations",
    description:
      "Inspect submitted drafts with automated side-by-side text analysis, statutory rule citations, and flagged passages. Every finding connects directly to relevant FINRA and SEC regulatory standards.",
    icon: FileCheck2,
    proTip: "Click any flagged finding to inspect statutory citations and review recommended remediation text.",
    previewType: "audit_workspace",
  },
  {
    title: "Determinations & Reports",
    badge: "Step 4: Determinations",
    headline: "Formal Determinations & Clean Remediated Files",
    description:
      "Issue 'Approved', 'Needs Revision', or 'Rejected' determinations with supervisory audit notes. Remediated document exports automatically strip internal findings so advisors receive clean, presentation-ready files.",
    icon: CheckCircle2,
    proTip: "Downloaded remediated files omit all internal finding and severity tags, while audit reports preserve full inspection trails.",
    previewType: "determinations",
  },
  {
    title: "Institutional AI Copilot",
    badge: "Step 5: Institutional Copilot",
    headline: "Regulatory Precedent Research & Text Audits",
    description:
      "Consult the Copilot in the bottom-right corner to search historical audit precedents, review statutory requirements, and audit drafts. Use /grammar to check sentence validity and detect non-words before signing off.",
    icon: Bot,
    proTip: "Ask the copilot: 'What are required disclosures under FINRA 2210?' for instant statutory guidance.",
    previewType: "copilot",
  },
];

export function AppWalkthrough() {
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const walkthroughState = useSyncExternalStore(
    walkthroughStore.subscribe,
    walkthroughStore.getState,
    walkthroughStore.getServerSnapshot
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeRoleView, setActiveRoleView] = useState<"Advisor" | "Officer">("Advisor");
  const [hasCheckedFirstTime, setHasCheckedFirstTime] = useState(false);

  // Sync role view with current user session or forced role
  useEffect(() => {
    if (walkthroughState.forcedRole) {
      setActiveRoleView(walkthroughState.forcedRole);
    } else if (session?.role === "Officer") {
      setActiveRoleView("Officer");
    } else {
      setActiveRoleView("Advisor");
    }
  }, [session?.role, walkthroughState.forcedRole]);

  // First-time visit auto-trigger check
  useEffect(() => {
    if (!session || hasCheckedFirstTime) return;

    const userIdentifier = session.email || (session as any).userId || (session as any).id || "user";
    const role = session.role || "Advisor";

    const alreadyCompleted = walkthroughStore.hasCompleted(userIdentifier, role);

    if (!alreadyCompleted) {
      // Delay slightly so dashboard mounts smoothly
      const timer = setTimeout(() => {
        walkthroughStore.openWalkthrough(role === "Officer" ? "Officer" : "Advisor");
      }, 600);
      setHasCheckedFirstTime(true);
      return () => clearTimeout(timer);
    }
    setHasCheckedFirstTime(true);
  }, [session, hasCheckedFirstTime]);

  const steps = activeRoleView === "Officer" ? OFFICER_STEPS : ADVISOR_STEPS;
  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleClose = useCallback(() => {
    if (session) {
      const userIdentifier = session.email || (session as any).userId || (session as any).id || "user";
      const role = session.role || "Advisor";
      walkthroughStore.markCompleted(userIdentifier, role);
    }
    walkthroughStore.closeWalkthrough();
  }, [session]);

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  // Keyboard navigation
  useEffect(() => {
    if (!walkthroughState.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight") {
        if (!isLastStep) setCurrentStepIndex((p) => Math.min(p + 1, steps.length - 1));
      } else if (e.key === "ArrowLeft") {
        if (!isFirstStep) setCurrentStepIndex((p) => Math.max(p - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [walkthroughState.isOpen, isFirstStep, isLastStep, steps.length, handleClose]);

  if (!walkthroughState.isOpen) return null;

  const IconComponent = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Application Walkthrough"
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl border border-[#E6E8E7] shadow-2xl overflow-hidden box-border text-[#183028] animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E6E8E7] bg-white">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#183028] text-[#C5E86C]">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#183028]">
                Springer Capital Onboarding
              </span>
              <div className="text-[10px] text-[#183028]/60 font-medium">
                Institutional Regulatory Compliance Walkthrough
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Role Switcher Pill */}
            <div className="flex items-center rounded-lg bg-[#E6E8E7]/40 p-0.5 border border-[#E6E8E7] text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveRoleView("Advisor");
                  setCurrentStepIndex(0);
                }}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                  activeRoleView === "Advisor"
                    ? "bg-white text-[#183028] font-bold shadow-2xs"
                    : "text-[#183028]/60 hover:text-[#183028]"
                )}
              >
                Advisor
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRoleView("Officer");
                  setCurrentStepIndex(0);
                }}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                  activeRoleView === "Officer"
                    ? "bg-white text-[#183028] font-bold shadow-2xs"
                    : "text-[#183028]/60 hover:text-[#183028]"
                )}
              >
                Officer
              </button>
            </div>

            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-[#183028]/50 hover:text-[#183028] hover:bg-[#E6E8E7]/60 transition-colors cursor-pointer"
              aria-label="Close walkthrough"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Indicators */}
        <div className="px-5 pt-3.5 pb-1 bg-white">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#183028]/70 mb-1.5">
            <span className="flex items-center gap-1.5 text-xs text-[#183028] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-[#C5E86C]/40 text-[#183028] text-[10.5px]">
                {currentStep.badge}
              </span>
            </span>
            <span className="font-mono text-[10.5px] font-bold text-[#183028]">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  idx === currentStepIndex
                    ? "bg-[#183028]"
                    : idx < currentStepIndex
                    ? "bg-[#C5E86C]"
                    : "bg-[#E6E8E7]"
                )}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {/* Step Header */}
          <div className="flex items-start gap-3 pt-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C5E86C]/30 border border-[#C5E86C]/60 text-[#183028] shrink-0 shadow-2xs">
              <IconComponent className="h-5 w-5 text-[#183028]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#183028] leading-tight">
                {currentStep.headline}
              </h3>
              <p className="text-xs text-[#183028]/75 mt-1 leading-relaxed">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Dynamic Interactive Preview Card */}
          <div className="rounded-xl border border-[#E6E8E7] bg-slate-50/70 p-3.5 space-y-2.5">
            <WalkthroughVisualPreview
              type={currentStep.previewType}
              isOfficer={activeRoleView === "Officer"}
            />
          </div>

          {/* Pro Tip Callout */}
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950">
            <HelpCircle className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="font-semibold text-emerald-900">Institutional Pro-Tip: </strong>
              <span>{currentStep.proTip}</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E6E8E7] bg-white">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-semibold text-[#183028]/60 hover:text-[#183028] transition-colors cursor-pointer"
          >
            Skip Walkthrough
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E6E8E7] bg-white hover:bg-slate-50 text-xs font-semibold text-[#183028] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#183028] hover:bg-[#203f35] text-[#C5E86C] text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>{isLastStep ? "Complete Walkthrough" : "Next"}</span>
              {isLastStep ? (
                <Check className="h-3 w-3" />
              ) : (
                <ArrowRight className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders role-specific graphical mockups illustrating key platform features.
 */
function WalkthroughVisualPreview({
  type,
  isOfficer,
}: {
  type: IWalkthroughStep["previewType"];
  isOfficer: boolean;
}) {
  switch (type) {
    case "welcome":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-[#183028]">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Statutory Verification Active
            </span>
            <span className="font-mono text-[9.5px] text-[#183028]/60">
              FINRA Rule 2210 &bull; SEC Rule 206(4)-1
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-lg border border-[#E6E8E7] shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-[#183028]/60">
                {isOfficer ? "Supervisory Scope" : "Advisor Filings"}
              </div>
              <div className="text-xs font-bold text-[#183028] mt-0.5">
                {isOfficer ? "All Correspondence & Ads" : "Client Recommendations"}
              </div>
              <p className="text-[10px] text-[#183028]/70 mt-1">
                {isOfficer
                  ? "Audit suitability, risk disclosures, and statutory disclaimers."
                  : "Automated scan on upload catches promissory claims before officer review."}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-[#E6E8E7] shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-[#183028]/60">
                Compliance Standard
              </div>
              <div className="text-xs font-bold text-emerald-700 mt-0.5">
                Fiduciary & Fair-Balance
              </div>
              <p className="text-[10px] text-[#183028]/70 mt-1">
                Zero-tolerance for promissory returns or unqualified risk-free statements.
              </p>
            </div>
          </div>
        </div>
      );

    case "upload_pii":
      return (
        <div className="space-y-2">
          <div className="p-2 bg-white rounded-lg border border-dashed border-[#E6E8E7] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#C5E86C]/30 rounded text-[#183028]">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#183028]">
                  Retirement_Recommendation_Whitfield.pdf
                </div>
                <div className="text-[10px] text-[#183028]/60">
                  Client Account: MOW-88213456 &bull; PDF Document
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              PII Redacted ✓
            </span>
          </div>

          <div className="p-2 bg-white rounded-lg border border-[#E6E8E7] text-[10.5px] font-mono text-[#183028]/80 space-y-1">
            <div className="text-[9.5px] uppercase font-bold text-[#183028]/60 font-sans">
              Automated Ingestion Sanitizer:
            </div>
            <div className="text-xs">
              Client SSN: <span className="px-1 bg-amber-100 text-amber-900 rounded font-bold">[SSN_MASKED]</span>
            </div>
            <div className="text-xs">
              Contact Phone: <span className="px-1 bg-amber-100 text-amber-900 rounded font-bold">[PHONE_MASKED]</span>
            </div>
          </div>
        </div>
      );

    case "versioning":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#183028] font-bold">Document Revision Lineage</span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Approved Version Available
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#E6E8E7] text-xs">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold text-[10px] rounded">
                  v1.0
                </span>
                <span className="text-[#183028]/70">Initial Submission</span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Needs Revision (2 Findings)
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-300 bg-emerald-50/30 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-[#C5E86C] text-[#183028] font-mono font-bold text-[10px] rounded">
                  v2.0
                </span>
                <span className="text-[#183028] font-bold">Remediated Amendment</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                Approved ✓
              </span>
            </div>
          </div>
        </div>
      );

    case "audit_trail":
      return (
        <div className="p-2.5 bg-white rounded-lg border border-[#E6E8E7] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#183028]">
            <span className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-emerald-600" />
              Permanent Compliance Audit Log
            </span>
            <span className="text-[9.5px] font-mono text-[#183028]/60">
              SHA-256 Ledger
            </span>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-[#183028] font-medium">DOCUMENT_SUBMISSION &bull; v1.0</span>
              <span className="text-[#183028]/60 font-mono">10:14 AM</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-[#183028] font-medium">PII_MASK_APPLIED &bull; 2 Tokens</span>
              <span className="text-[#183028]/60 font-mono">10:14 AM</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50/60 border border-emerald-200">
              <span className="text-emerald-900 font-bold">OFFICER_APPROVAL &bull; Alex Smith (Officer)</span>
              <span className="text-emerald-800 font-mono">03:42 PM</span>
            </div>
          </div>
        </div>
      );

    case "queue":
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#183028]">
            <span>Supervisory Review Queue</span>
            <span className="text-[10px] text-[#183028]/60 font-mono">3 Pending Filings</span>
          </div>
          <div className="space-y-1 text-[10.5px]">
            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#E6E8E7]">
              <div>
                <span className="font-bold text-[#183028]">Portfolio Restructuring Memo</span>
                <div className="text-[9.5px] text-[#183028]/60">Rep: Sarah Jenkins &bull; MOW-88213456</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                High Risk
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#E6E8E7]">
              <div>
                <span className="font-bold text-[#183028]">Q3 Market Commentary</span>
                <div className="text-[9.5px] text-[#183028]/60">Rep: David Vance &bull; Public Pitch</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Medium Risk
              </span>
            </div>
          </div>
        </div>
      );

    case "audit_workspace":
      return (
        <div className="p-2.5 bg-white rounded-lg border border-[#E6E8E7] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#183028]">
            <span className="text-rose-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Flagged Finding: Promissory Return
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
              FINRA-2210
            </span>
          </div>
          <div className="p-2 rounded bg-rose-50/70 border border-rose-200 text-[10.5px] space-y-1">
            <div className="line-through text-rose-700 font-mono text-[10px]">
              &ldquo;This strategy guarantees a 12% annual return with zero risk.&rdquo;
            </div>
            <div className="text-emerald-700 font-bold font-mono text-[10px]">
              &ldquo;This portfolio targets long-term growth, subject to market fluctuation.&rdquo;
            </div>
          </div>
        </div>
      );

    case "determinations":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#183028]">
            <span>Statutory Determination Actions</span>
            <span className="text-[10px] text-emerald-700 font-bold">Client Download Sanitized</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
            <div className="p-2 rounded-lg bg-emerald-100/70 border border-emerald-300 text-emerald-900">
              Approve Filing
            </div>
            <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900">
              Require Revision
            </div>
            <div className="p-2 rounded-lg bg-rose-100/70 border border-rose-300 text-rose-900">
              Reject Draft
            </div>
          </div>
          <div className="p-2 bg-white rounded-lg border border-[#E6E8E7] text-[10px] text-[#183028]/70 flex items-center justify-between">
            <span>Export Clean Remediated (.txt / .pdf)</span>
            <Download className="h-3 w-3 text-emerald-600" />
          </div>
        </div>
      );

    case "copilot":
      return (
        <div className="p-2.5 bg-white rounded-lg border border-[#E6E8E7] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#183028]">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <Bot className="h-3.5 w-3.5" />
              Springer Neural Copilot
            </span>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#C5E86C]/40 text-[#183028] font-bold">
              Embedded AI
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="p-2 bg-slate-50 rounded border border-slate-100 space-y-0.5">
              <div className="font-mono font-bold text-emerald-800">/grammar &lt;text&gt;</div>
              <p className="text-[9.5px] text-[#183028]/70">
                Validates English words &amp; evaluates Good vs. Bad sentence quality.
              </p>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-100 space-y-0.5">
              <div className="font-mono font-bold text-[#183028]">/enhance &lt;draft&gt;</div>
              <p className="text-[9.5px] text-[#183028]/70">
                Formats drafts into SEC &amp; FINRA compliant institutional memos.
              </p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
