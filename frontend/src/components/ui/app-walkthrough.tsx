"use client";

/**
 * DOCU: Interactive Onboarding Guidance & Spotlight Tour for Springer Capital Compliance Platform.
 * Automatically initiates only on first-time visit/login for both Advisors and Officers.
 * Features strict role isolation (Advisor-only or Officer-only) and an interactive spotlight pointer
 * that physically highlights and points to the actual buttons and workspace components on the screen.
 * Last Updated Date: September 25, 2026
 * @author Keith
 */

import React, { useState, useEffect, useSyncExternalStore, useCallback, useRef } from "react";
import {
  Sparkles,
  ShieldCheck,
  UploadCloud,
  FileCheck2,
  Layers,
  History,
  Bot,
  ListOrdered,
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  Check,
  HelpCircle,
  MousePointerClick,
  Filter,
  Eye,
} from "lucide-react";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { walkthroughStore } from "@/lib/walkthrough-store";
import { cn } from "@/lib/utils";

interface ISpotlightStep {
  targetKey: string;
  targetLabel: string;
  title: string;
  headline: string;
  description: string;
  actionGuidance: string;
  proTip: string;
  statutoryRule?: string;
  icon: React.ComponentType<{ className?: string }>;
  preferredPlacement: "right" | "bottom" | "top" | "left";
}

const ADVISOR_SPOTLIGHT_STEPS: ISpotlightStep[] = [
  {
    targetKey: "nav-dashboard",
    targetLabel: "Sidebar Navigation: Dashboard",
    title: "Advisor Workspace Overview",
    headline: "Your Central Submissions Dashboard",
    description:
      "This is your primary Advisory Workspace. Monitor all your client recommendation documents, retirement portfolio restructurings, and marketing materials here.",
    actionGuidance:
      "Check this dashboard to review filing volume, pending evaluations, and recent compliance determinations.",
    proTip: "Keep this tab open as your main operational hub for client document submissions.",
    statutoryRule: "FINRA Rule 2210 & Rule 2111 (Suitability)",
    icon: Sparkles,
    preferredPlacement: "right",
  },
  {
    targetKey: "advisor-upload",
    targetLabel: "Upload Document Button",
    title: "Submitting Client Documents",
    headline: "Upload Drafts with Automated PII Masking",
    description:
      "Click this 'Upload Document' button to submit new client correspondence (.pdf, .docx, .txt). The system automatically detects and masks sensitive client PII (SSNs, phone numbers) before regulatory ledger storage.",
    actionGuidance:
      "Click here whenever you have a new client recommendation or marketing draft ready for compliance pre-check.",
    proTip: "Client identities are converted into secure audit tokens (e.g. [SSN_MASKED]) for complete confidentiality.",
    statutoryRule: "Automatic PII Ingestion Sanitizer",
    icon: UploadCloud,
    preferredPlacement: "bottom",
  },
  {
    targetKey: "advisor-status-filter",
    targetLabel: "Status Filters & Document Table",
    title: "Tracking Review Cycles & Lineage",
    headline: "Document Status & Multi-Version Revisions",
    description:
      "Filter your submissions by 'Pending', 'Needs Revision', or 'Approved'. When an officer requests revisions, open the document to upload an amended revision (v2, v3) without breaking audit history.",
    actionGuidance:
      "Always upload revisions directly onto existing submissions to preserve complete regulatory lineage.",
    proTip: "Clean remediated files can be downloaded directly from the review workspace with internal audit notes removed.",
    statutoryRule: "Regulatory Version Lineage Standard",
    icon: Layers,
    preferredPlacement: "bottom",
  },
  {
    targetKey: "nav-audit",
    targetLabel: "Sidebar Navigation: Audit Trail",
    title: "Permanent Regulatory Ledger",
    headline: "Immutable Fiduciary Audit Ledger",
    description:
      "Click 'Audit Trail' in the sidebar to access Springer Capital's permanent regulatory ledger. Every upload, automated PII mask event, and officer determination is permanently logged with cryptographic timestamps.",
    actionGuidance:
      "Use the Audit Trail tab whenever you need documentation proof for internal exams or regulatory audits.",
    proTip: "Full supervisory notes and timestamped decision records are preserved for SEC and FINRA audit defensibility.",
    statutoryRule: "SEC Rule 206 Books & Records Mandate",
    icon: History,
    preferredPlacement: "right",
  },
  {
    targetKey: "copilot-widget",
    targetLabel: "Bottom-Right: Neural Copilot Launcher",
    title: "AI Compliance Assistant",
    headline: "Your Neural Compliance Copilot",
    description:
      "Click this floating Copilot button in the bottom-right corner! Type /grammar to check sentence quality and verify real English dictionary words, /enhance to format drafts into institutional compliance memos, or /rules for FINRA/SEC guides.",
    actionGuidance:
      "Click the button anytime to test draft sentences before submitting them for formal review.",
    proTip: "Run /grammar on draft statements to catch promissory language and verify vocabulary before officer review.",
    statutoryRule: "Embedded AI: FINRA 2210 Non-Promissory Standard",
    icon: Bot,
    preferredPlacement: "top",
  },
];

const OFFICER_SPOTLIGHT_STEPS: ISpotlightStep[] = [
  {
    targetKey: "nav-queue",
    targetLabel: "Sidebar Navigation: Review Queue",
    title: "Supervisory Review Console",
    headline: "Your Central Review Queue",
    description:
      "This is your primary supervisory workspace. All incoming advisor filings and client recommendation correspondence flow directly into this queue awaiting your compliance review and statutory sign-off.",
    actionGuidance:
      "Navigate here daily to inspect newly submitted advisor filings and monitor queue turnaround velocity.",
    proTip: "Supervisory officers hold statutory approval authority across all advisory communications.",
    statutoryRule: "FINRA Rule 3110 (Supervision Standard)",
    icon: ShieldCheck,
    preferredPlacement: "right",
  },
  {
    targetKey: "officer-priority",
    targetLabel: "Risk Priority Filter & Triage",
    title: "Risk-Based Queue Triage",
    headline: "Priority & Severity Filtering",
    description:
      "Use this filter dropdown to triage filings by risk severity (High, Medium, Urgent). Filings with promissory return statements or missing downside risk disclosures are automatically ranked with High priority.",
    actionGuidance:
      "Filter for 'High' priority first to address potentially non-compliant public representations immediately.",
    proTip: "Promissory claims without balanced risk disclosures are strictly prohibited under FINRA Rule 2210.",
    statutoryRule: "FINRA Rule 2210 & SEC Rule 206(4)-1",
    icon: Filter,
    preferredPlacement: "bottom",
  },
  {
    targetKey: "officer-review-btn",
    targetLabel: "Queue Action: Review Button",
    title: "Compliance Audit Workspace",
    headline: "Side-by-Side Review & Rule Citations",
    description:
      "Click 'Review' on any pending submission to enter the side-by-side Compliance Audit Workspace. Here you inspect flagged passages, view statutory rule citations, and issue 'Approved', 'Needs Revision', or 'Rejected' determinations.",
    actionGuidance:
      "Click 'Review' to inspect side-by-side text, review citations, and issue legally binding determinations.",
    proTip: "All flagged findings connect directly to FINRA and SEC regulatory codes with suggested remediations.",
    statutoryRule: "Statutory Rule Citation Engine",
    icon: Eye,
    preferredPlacement: "left",
  },
  {
    targetKey: "nav-audit",
    targetLabel: "Sidebar Navigation: Audit History",
    title: "Supervisory Audit Trail",
    headline: "Historical Determinations & Audit Reports",
    description:
      "Click 'Audit History' in the sidebar to review past determinations, officer signatures, and export audit-defensible inspection reports for SEC/FINRA regulatory examinations.",
    actionGuidance:
      "Access this tab to verify historical supervisory sign-offs and download clean remediated documents.",
    proTip: "Downloaded remediated documents automatically omit internal findings so advisors can safely share approved correspondence.",
    statutoryRule: "SEC Rule 206 Regulatory Retention",
    icon: History,
    preferredPlacement: "right",
  },
  {
    targetKey: "copilot-widget",
    targetLabel: "Bottom-Right: Institutional Copilot",
    title: "Regulatory AI & Precedent Research",
    headline: "Institutional Compliance Copilot",
    description:
      "Click this floating Copilot button in the bottom-right corner! Consult the AI to look up FINRA & SEC regulatory precedents, search historical audits, and audit draft text before signing off on supervisory memos.",
    actionGuidance:
      "Click the Copilot button to ask questions like: 'What are required disclosures under FINRA 2210?'",
    proTip: "Use /grammar inside the Copilot to verify sentence validity and detect non-words before issuing formal memos.",
    statutoryRule: "Institutional AI Precedent Discovery",
    icon: Bot,
    preferredPlacement: "top",
  },
];

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

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
  const [hasCheckedFirstTime, setHasCheckedFirstTime] = useState(false);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Strict role enforcement: If Officer, strictly Officer. If Advisor, strictly Advisor.
  const isOfficer = session?.role === "Officer";
  const steps = isOfficer ? OFFICER_SPOTLIGHT_STEPS : ADVISOR_SPOTLIGHT_STEPS;
  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // First-time visit auto-trigger check
  useEffect(() => {
    if (!session || hasCheckedFirstTime) return;

    const userIdentifier = session.email || (session as any).userId || (session as any).id || "user";
    const role = session.role || "Advisor";

    const alreadyCompleted = walkthroughStore.hasCompleted(userIdentifier, role);

    if (!alreadyCompleted) {
      // Delay slightly so dashboard mounts and elements render smoothly
      const timer = setTimeout(() => {
        walkthroughStore.openWalkthrough(role === "Officer" ? "Officer" : "Advisor");
      }, 700);
      setHasCheckedFirstTime(true);
      return () => clearTimeout(timer);
    }
    setHasCheckedFirstTime(true);
  }, [session, hasCheckedFirstTime]);

  // Measure and locate target element on step change or window scroll/resize
  const updateTargetPosition = useCallback(() => {
    if (!walkthroughState.isOpen || !currentStep) return;

    const targetEl = document.querySelector(`[data-tour="${currentStep.targetKey}"]`);

    if (targetEl) {
      // Scroll into view gently if needed
      targetEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      const rect = targetEl.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      });
    } else {
      // Fallback if element not found in DOM
      setTargetRect(null);
    }
  }, [walkthroughState.isOpen, currentStep]);

  useEffect(() => {
    updateTargetPosition();
    const handleRecalculate = () => updateTargetPosition();

    window.addEventListener("resize", handleRecalculate);
    window.addEventListener("scroll", handleRecalculate, true);

    const timer = setTimeout(updateTargetPosition, 250);

    return () => {
      window.removeEventListener("resize", handleRecalculate);
      window.removeEventListener("scroll", handleRecalculate, true);
      clearTimeout(timer);
    };
  }, [updateTargetPosition, currentStepIndex]);

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

  // Calculate Guidance Card Coordinates relative to viewport & targetRect
  let cardStyles: React.CSSProperties = {};
  let pointerArrowPosition: "top" | "bottom" | "left" | "right" | "center" = "center";

  if (targetRect && typeof window !== "undefined") {
    const cardWidth = Math.min(420, window.innerWidth - 32);
    const cardEstimatedHeight = 360;
    const padding = 16;

    if (currentStep.preferredPlacement === "right") {
      // Place card to the right of element
      let left = targetRect.right + padding;
      let top = Math.max(padding, Math.min(window.innerHeight - cardEstimatedHeight - padding, targetRect.top - 20));

      if (left + cardWidth > window.innerWidth - padding) {
        // Not enough room on right, fallback to bottom or left
        left = Math.max(padding, targetRect.left - cardWidth - padding);
        pointerArrowPosition = "right";
      } else {
        pointerArrowPosition = "left";
      }

      cardStyles = {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
      };
    } else if (currentStep.preferredPlacement === "bottom") {
      // Place card below element
      let top = targetRect.bottom + padding;
      let left = Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, targetRect.left - 40));

      if (top + cardEstimatedHeight > window.innerHeight - padding) {
        // Fallback above
        top = Math.max(padding, targetRect.top - cardEstimatedHeight - padding);
        pointerArrowPosition = "bottom";
      } else {
        pointerArrowPosition = "top";
      }

      cardStyles = {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
      };
    } else if (currentStep.preferredPlacement === "top") {
      // Place card above element (e.g. bottom-right Copilot)
      let top = Math.max(padding, targetRect.top - cardEstimatedHeight - padding);
      let left = Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, targetRect.right - cardWidth));
      pointerArrowPosition = "bottom";

      cardStyles = {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
      };
    } else if (currentStep.preferredPlacement === "left") {
      // Place card to the left of element
      let left = Math.max(padding, targetRect.left - cardWidth - padding);
      let top = Math.max(padding, Math.min(window.innerHeight - cardEstimatedHeight - padding, targetRect.top - 20));
      pointerArrowPosition = "right";

      cardStyles = {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
      };
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
      {/* 1. Backdrop Overlay */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-[2px] transition-opacity duration-200 cursor-pointer"
        aria-hidden="true"
      />

      {/* 2. Spotlight Cutout / Glowing Highlighter Box */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
          className="rounded-xl border-2 border-[#C5E86C] ring-4 ring-[#C5E86C]/40 shadow-[0_0_35px_rgba(197,232,108,0.7)] pointer-events-none transition-all duration-300 ease-out z-50 animate-pulse"
        />
      )}

      {/* 3. Floating Guidance Pointer Card */}
      <div
        ref={cardRef}
        style={targetRect ? cardStyles : undefined}
        className={cn(
          "z-50 bg-white rounded-2xl border border-[#E6E8E7] shadow-2xl overflow-hidden box-border text-[#183028] transition-all duration-300 animate-in zoom-in-95",
          !targetRect && "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-lg"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`${isOfficer ? "Officer" : "Advisor"} Onboarding Guidance`}
      >
        {/* Top Pointing Indicator Header */}
        <div className="bg-[#183028] text-white px-4 py-2.5 flex items-center justify-between gap-2 border-b border-[#183028]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C5E86C] text-[#183028] shrink-0">
              <MousePointerClick className="h-3 w-3" />
            </span>
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#C5E86C] block leading-none">
                {isOfficer ? "Officer Supervisory Guidance" : "Advisor Onboarding Guidance"}
              </span>
              <span className="text-xs font-semibold text-white truncate block">
                {currentStep.targetLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
              {currentStepIndex + 1}/{steps.length}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Skip Guidance"
              aria-label="Close onboarding guidance"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-5 gap-1 p-2 bg-[#FAFBFB] border-b border-[#E6E8E7]">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStepIndex(idx)}
              className={cn(
                "h-1 rounded-full transition-all cursor-pointer",
                idx === currentStepIndex
                  ? "bg-[#183028]"
                  : idx < currentStepIndex
                  ? "bg-[#C5E86C]"
                  : "bg-[#E6E8E7]"
              )}
              aria-label={`Jump to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Guidance Content Body */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Headline & Icon */}
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C5E86C]/30 border border-[#C5E86C]/60 text-[#183028] shrink-0 shadow-2xs mt-0.5">
              <IconComponent className="h-4.5 w-4.5 text-[#183028]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#183028] leading-snug">
                {currentStep.headline}
              </h3>
              <p className="text-xs text-[#183028]/75 mt-1 leading-relaxed">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Action Box: What the user must do here */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#183028] space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#183028]/60 flex items-center gap-1">
              <Compass className="h-3 w-3 text-emerald-700" />
              <span>What You Will Work on Here:</span>
            </div>
            <p className="text-[11px] leading-relaxed font-medium text-[#183028]">
              {currentStep.actionGuidance}
            </p>
          </div>

          {/* Pro Tip Box */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950">
            <HelpCircle className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-[10.5px] leading-relaxed">
              <strong className="font-semibold text-emerald-900">Pro-Tip: </strong>
              <span>{currentStep.proTip}</span>
            </div>
          </div>

          {/* Regulatory Citation Tag */}
          {currentStep.statutoryRule && (
            <div className="flex items-center justify-between text-[10px] text-[#183028]/60 pt-0.5 font-mono">
              <span>Regulatory Standard:</span>
              <span className="font-bold text-[#183028]">{currentStep.statutoryRule}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-3 border-t border-[#E6E8E7] bg-white">
          <button
            type="button"
            onClick={handleClose}
            className="text-[11px] font-semibold text-[#183028]/60 hover:text-[#183028] transition-colors cursor-pointer"
          >
            Skip Guidance
          </button>

          <div className="flex items-center gap-1.5">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E6E8E7] bg-white hover:bg-slate-50 text-[11px] font-semibold text-[#183028] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#183028] hover:bg-[#203f35] text-[#C5E86C] text-[11px] font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>{isLastStep ? "Got it, Finish" : "Next Point"}</span>
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
