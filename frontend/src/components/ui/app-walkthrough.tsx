"use client";

/**
 * DOCU: First-Time Guided Spotlight Tour for Springer Capital Compliance Review.
 * Automatically appears on first-time login without manual interaction.
 * Highlights exactly four things in sequence, one at a time, with an illuminated spotlight
 * and a small, viewport-clamped tooltip ensuring the Next button is always fully visible.
 * Includes Account & Settings for both Advisor and Officer.
 * Last Updated Date: September 25, 2026
 * @author Keith
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import {
  LayoutDashboard,
  UploadCloud,
  ShieldCheck,
  Filter,
  History,
  Settings,
  Calendar,
  FileText,
  Bot,
  Bell,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { walkthroughStore } from "@/lib/walkthrough-store";
import { cn } from "@/lib/utils";

interface ISpotlightStep {
  targetKey: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  preferredPlacement: "right" | "bottom" | "top" | "left";
}

/**
 * Sequential highlight steps for Advisors (including File Viewer, Date Filter, Notifications, Settings, and AI Copilot).
 */
const ADVISOR_SPOTLIGHT_STEPS: ISpotlightStep[] = [
  {
    targetKey: "nav-dashboard",
    title: "Advisor Dashboard",
    description:
      "Your central hub to monitor client recommendation correspondence, track filing volume, and check review statuses in real time.",
    icon: LayoutDashboard,
    preferredPlacement: "right",
  },
  {
    targetKey: "advisor-upload",
    title: "Upload Document",
    description:
      "Submit client recommendation drafts (.pdf, .docx, .txt). The system automatically detects and masks sensitive client PII (SSNs, phone numbers).",
    icon: UploadCloud,
    preferredPlacement: "bottom",
  },
  {
    targetKey: "advisor-view-files",
    title: "Document Tracking & File Viewer",
    description:
      "Inspect submitted correspondence, view full document text, verify PII redaction tokens, and download clean remediated files.",
    icon: FileText,
    preferredPlacement: "bottom",
  },
  {
    targetKey: "dashboard-date-filter",
    title: "Date Range & Calendar Filter",
    description:
      "Filter your filings using quick date presets (Today, Past 7 Days, This Month) or click specific calendar days to analyze submission activity.",
    icon: Calendar,
    preferredPlacement: "left",
  },
  {
    targetKey: "header-notifications",
    title: "Real-Time Notification Alerts",
    description:
      "Receive live alerts when the Compliance Officer approves your filing, requests required revisions, or returns detailed regulatory determinations.",
    icon: Bell,
    preferredPlacement: "bottom",
  },
  {
    targetKey: "nav-audit",
    title: "Audit Trail",
    description:
      "Inspect the immutable regulatory ledger logging cryptographic upload timestamps, sanitization proofs, and officer determinations.",
    icon: History,
    preferredPlacement: "right",
  },
  {
    targetKey: "nav-settings",
    title: "Account & Settings",
    description:
      "Manage your advisor profile, credential details, notification preferences, and account security configurations.",
    icon: Settings,
    preferredPlacement: "right",
  },
  {
    targetKey: "copilot-widget",
    title: "Neural Compliance AI Copilot",
    description:
      "Click the AI Copilot button in the bottom-right corner to test sentences with /grammar, query the database with /query, view /stats, or ask regulatory questions.",
    icon: Bot,
    preferredPlacement: "top",
  },
];

/**
 * Sequential highlight steps for Officers (including File Viewer, Date Filter, Notifications, Settings, and AI Copilot).
 */
const OFFICER_SPOTLIGHT_STEPS: ISpotlightStep[] = [
  {
    targetKey: "nav-queue",
    title: "Supervisory Review Queue",
    description:
      "Your supervisory console to triage and audit incoming advisor recommendation drafts awaiting formal compliance sign-off.",
    icon: ShieldCheck,
    preferredPlacement: "right",
  },
  {
    targetKey: "officer-priority",
    title: "Risk Priority Triage",
    description:
      "Filter submissions by risk severity (High, Medium, Urgent). Filings with promissory language or missing risk disclosures are prioritized.",
    icon: Filter,
    preferredPlacement: "bottom",
  },
  {
    targetKey: "officer-view-files",
    title: "Document Queue & Review Inspection",
    description:
      "Click any filing to open the Compliance Audit Workspace for side-by-side inspection, flagged rule citations, and statutory sign-offs.",
    icon: FileText,
    preferredPlacement: "bottom",
  },
  {
    targetKey: "dashboard-date-filter",
    title: "Date Range & Calendar Filter",
    description:
      "Triage review volume across specific time intervals or click interactive calendar days to isolate historical review cycles and pending filings.",
    icon: Calendar,
    preferredPlacement: "left",
  },
  {
    targetKey: "header-notifications",
    title: "Supervisory Notification Alerts",
    description:
      "Stay alerted to newly submitted advisor drafts, re-submitted revision filings, and high-risk compliance triage escalations requiring officer sign-off.",
    icon: Bell,
    preferredPlacement: "bottom",
  },
  {
    targetKey: "nav-audit",
    title: "Audit History",
    description:
      "Review historical supervisory determinations, officer signatures, and export audit-defensible inspection reports.",
    icon: History,
    preferredPlacement: "right",
  },
  {
    targetKey: "nav-settings",
    title: "Account & Settings",
    description:
      "Configure your compliance officer supervisory profile, statutory designation, notification triggers, and platform preferences.",
    icon: Settings,
    preferredPlacement: "right",
  },
  {
    targetKey: "copilot-widget",
    title: "Institutional AI Copilot & Precedents",
    description:
      "Query the AI Copilot to research FINRA & SEC regulatory precedents, query compliance records with /query, inspect /stats, and audit supervisory memos before sign-off.",
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
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastCheckedKey = useRef<string>("");

  // Role determination
  const isOfficer = session?.role === "Officer";
  const steps = isOfficer ? OFFICER_SPOTLIGHT_STEPS : ADVISOR_SPOTLIGHT_STEPS;
  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Auto-launch on first-time login without manual clicking
  useEffect(() => {
    if (!session) return;

    const userIdentifier = session.email || (session as any).userId || (session as any).id || "user";
    const role = session.role || "Advisor";
    const currentKey = `${userIdentifier}_${role}`;

    if (lastCheckedKey.current === currentKey) return;
    lastCheckedKey.current = currentKey;

    // Strictly display ONCE per user account and role
    const alreadyCompleted = walkthroughStore.hasCompleted(userIdentifier, role);

    if (!alreadyCompleted) {
      const timer = setTimeout(() => {
        walkthroughStore.openWalkthrough(role === "Officer" ? "Officer" : "Advisor");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session]);

  // Reset step index whenever walkthrough is freshly opened
  useEffect(() => {
    if (walkthroughState.isOpen) {
      setCurrentStepIndex(0);
    }
  }, [walkthroughState.isOpen]);

  // Locate and measure target element
  const updateTargetPosition = useCallback(() => {
    if (!walkthroughState.isOpen || !currentStep) return;

    const targetEl = document.querySelector(`[data-tour="${currentStep.targetKey}"]`);

    if (targetEl) {
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
      setTargetRect(null);
    }
  }, [walkthroughState.isOpen, currentStep]);

  useEffect(() => {
    updateTargetPosition();
    const handleRecalculate = () => updateTargetPosition();

    window.addEventListener("resize", handleRecalculate);
    window.addEventListener("scroll", handleRecalculate, true);

    const timer = setTimeout(updateTargetPosition, 200);

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

  // Keyboard navigation: ArrowRight / Space / Enter = Next, ArrowLeft = Back, Escape = Close
  useEffect(() => {
    if (!walkthroughState.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!isLastStep) setCurrentStepIndex((p) => Math.min(p + 1, steps.length - 1));
        else handleClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (!isFirstStep) setCurrentStepIndex((p) => Math.max(p - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [walkthroughState.isOpen, isFirstStep, isLastStep, steps.length, handleClose]);

  if (!walkthroughState.isOpen) return null;

  const IconComponent = currentStep.icon;

  // Viewport bounds calculation to guarantee the tooltip and Next button are ALWAYS 100% visible
  let tooltipStyles: React.CSSProperties = {};
  let arrowPlacement: "left" | "right" | "top" | "bottom" = "left";

  if (targetRect && typeof window !== "undefined") {
    const tooltipWidth = Math.min(320, window.innerWidth - 32);
    const tooltipEstimatedHeight = 190;
    const offset = 14;
    const padding = 16;

    if (currentStep.preferredPlacement === "right") {
      let left = targetRect.right + offset;
      let top = targetRect.top - 10;

      if (left + tooltipWidth > window.innerWidth - padding) {
        // Fallback to left
        left = Math.max(padding, targetRect.left - tooltipWidth - offset);
        arrowPlacement = "right";
      } else {
        arrowPlacement = "left";
      }

      // Guaranteed viewport clamping
      top = Math.max(padding, Math.min(window.innerHeight - tooltipEstimatedHeight - padding, top));
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

      tooltipStyles = {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
      };
    } else if (currentStep.preferredPlacement === "bottom") {
      let top = targetRect.bottom + offset;
      let left = targetRect.left - 10;

      if (top + tooltipEstimatedHeight > window.innerHeight - padding) {
        // Auto-flip ABOVE the target element so the Next button never gets cut off
        top = Math.max(padding, targetRect.top - tooltipEstimatedHeight - offset);
        arrowPlacement = "bottom";
      } else {
        arrowPlacement = "top";
      }

      // Guaranteed viewport clamping
      top = Math.max(padding, Math.min(window.innerHeight - tooltipEstimatedHeight - padding, top));
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

      tooltipStyles = {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
      };
    } else if (currentStep.preferredPlacement === "top") {
      let top = Math.max(padding, targetRect.top - tooltipEstimatedHeight - offset);
      let left = targetRect.left - 10;
      arrowPlacement = "bottom";

      top = Math.max(padding, Math.min(window.innerHeight - tooltipEstimatedHeight - padding, top));
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

      tooltipStyles = {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
      };
    } else {
      let left = targetRect.left - tooltipWidth - offset;
      let top = targetRect.top - 10;
      arrowPlacement = "right";

      top = Math.max(padding, Math.min(window.innerHeight - tooltipEstimatedHeight - padding, top));
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

      tooltipStyles = {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
      };
    }
  }

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-auto">
      {/* 1. Transparent Backdrop Click-Outside to Dismiss */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-transparent cursor-pointer z-[9989]"
        aria-hidden="true"
      />

      {/* 2. True Illuminated Spotlight Cutout:
          Uses a massive 9999px spread box-shadow so the dark overlay is ONLY outside the spotlight hole.
          The area over the target element has ZERO dark overlay, making it 100% visible, bright, and legible! */}
      {targetRect ? (
        <div
          style={{
            position: "fixed",
            top: `${Math.max(0, targetRect.top - 5)}px`,
            left: `${Math.max(0, targetRect.left - 5)}px`,
            width: `${targetRect.width + 10}px`,
            height: `${targetRect.height + 10}px`,
            boxShadow:
              "0 0 0 9999px rgba(15, 23, 42, 0.72), 0 0 25px rgba(197, 232, 108, 0.85), inset 0 0 8px rgba(197, 232, 108, 0.2)",
          }}
          className="rounded-xl border-2 border-[#C5E86C] ring-4 ring-[#C5E86C]/40 backdrop-brightness-110 pointer-events-none transition-all duration-200 ease-out z-[9991]"
        />
      ) : (
        <div
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-opacity duration-200 cursor-pointer z-[9990]"
          aria-hidden="true"
        />
      )}

      {/* 3. Small Tooltip Card */}
      <div
        ref={cardRef}
        style={targetRect ? tooltipStyles : undefined}
        className={cn(
          "z-[9999] bg-white rounded-xl border border-[#E6E8E7] shadow-2xl p-4 text-[#183028] transition-all duration-200 animate-in zoom-in-95 flex flex-col justify-between max-h-[calc(100vh-2rem)] shrink-0",
          !targetRect && "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 max-w-[calc(100vw-2rem)]"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`${isOfficer ? "Officer" : "Advisor"} Guided Tour`}
      >
        {/* Pointer Arrow */}
        {targetRect && (
          <div
            className={cn(
              "absolute w-2.5 h-2.5 bg-white border border-[#E6E8E7] transform rotate-45 pointer-events-none",
              arrowPlacement === "left" && "-left-1.5 top-6 border-r-0 border-t-0",
              arrowPlacement === "right" && "-right-1.5 top-6 border-l-0 border-b-0",
              arrowPlacement === "top" && "-top-1.5 border-b-0 border-r-0",
              arrowPlacement === "bottom" && "-bottom-1.5 border-t-0 border-l-0"
            )}
            style={{
              left:
                arrowPlacement === "top" || arrowPlacement === "bottom"
                  ? `${Math.max(
                      16,
                      Math.min(
                        296,
                        targetRect.left + targetRect.width / 2 - (tooltipStyles.left ? parseFloat(tooltipStyles.left as string) : targetRect.left) - 5
                      )
                    )}px`
                  : undefined,
            }}
          />
        )}

        {/* Tooltip Header: Step Pill + Role Badge + Close Button */}
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#183028] text-[#C5E86C]">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-[10px] font-semibold text-[#183028]/60 uppercase tracking-wider">
              {isOfficer ? "Officer" : "Advisor"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-[#183028]/40 hover:text-[#183028] hover:bg-slate-100 transition-colors cursor-pointer"
            title="Skip Tour"
            aria-label="Skip guided tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tooltip Title & Description */}
        <div className="flex items-start gap-2.5 mb-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C5E86C]/30 border border-[#C5E86C]/60 text-[#183028] shrink-0 mt-0.5">
            <IconComponent className="h-4 w-4 text-[#183028]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#183028] leading-tight">
              {currentStep.title}
            </h4>
            <p className="text-[11px] text-[#183028]/75 leading-relaxed mt-1">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Tooltip Footer: Progress Dots + Back Button + Next / Finish Button */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#E6E8E7] shrink-0">
          {/* Step Progress Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  idx === currentStepIndex
                    ? "w-4 bg-[#183028]"
                    : "w-1.5 bg-[#E6E8E7] hover:bg-[#183028]/40"
                )}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#E6E8E7] bg-white hover:bg-slate-50 text-[10px] font-semibold text-[#183028] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back</span>
              </button>
            )}

            <button
              id="tour-next-btn"
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#183028] hover:bg-[#203f35] text-[#C5E86C] text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
            >
              <span>{isLastStep ? "Finish" : "Next"}</span>
              {isLastStep ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
