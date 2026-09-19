"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authStore } from "@/lib/auth/auth-store";
import { Loader2, Check, ShieldCheck } from "lucide-react";
import { AILogo, CompanyLogo } from "@/components/ui/brand-logos";
import { cn } from "@/lib/utils";

interface AppWorkspaceLoaderProps {
  /** Optional custom title for the workspace loader. Defaults to "Initializing Workspace" */
  title?: string;
  /** Optional role label override. If omitted, detects from authStore session */
  roleName?: string;
  /** Optional completion callback when progress reaches 100% and transition completes */
  onComplete?: () => void;
  /** Optional flag to disable automated redirect when used inside a modal or preview */
  preventRedirect?: boolean;
  /** Custom destination route when 100% is reached (defaults to auto-detect session route) */
  redirectTo?: string;
}

interface StepMilestone {
  minProgress: number;
  step: string;
  desc: string;
}

const MILESTONES: StepMilestone[] = [
  {
    minProgress: 0,
    step: "Validating credentials...",
    desc: "Synchronizing biometric and hardware security token keys...",
  },
  {
    minProgress: 28,
    step: "Handshaking secure tunnel...",
    desc: "Routing through isolated SOC-2 Type II audit gateway...",
  },
  {
    minProgress: 58,
    step: "Decrypting compliance vault...",
    desc: "Loading compliance documents and verification models...",
  },
  {
    minProgress: 84,
    step: "Finalizing session launch...",
    desc: "Preparing real-time advisory dashboard and analytics...",
  },
  {
    minProgress: 100,
    step: "Session Ready — Launching...",
    desc: "Authentication verified. Access granted to workspace portal.",
  },
];

/**
 * DOCU: Next.js + shadcn workspace loading component with real-time continuous progress animation (0% to 100%),
 * orbiting glow particles, dynamic status milestone transitions, and popup launch animation.
 * Last Updated Date: September 13, 2026
 * @author Keith
 */
export function AppWorkspaceLoader({
  title = "Initializing Workspace",
  roleName,
  onComplete,
  preventRedirect = false,
  redirectTo,
}: AppWorkspaceLoaderProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const getInitialRoleLabel = (): string => {
    if (roleName) return roleName;
    const session = authStore.getSession();
    if (session?.role) {
      return session.role === "Advisor"
        ? "ADVISOR PORTAL ACCESS"
        : session.role === "Officer"
        ? "COMPLIANCE OFFICER ACCESS"
        : `${session.role.toUpperCase()} PORTAL ACCESS`;
    }
    return "INSTITUTIONAL ACCESS";
  };

  const [sessionRole] = useState<string>(getInitialRoleLabel);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Continuous fluid real-time progress animation from 0% to 100%
  useEffect(() => {
    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 2400; // Total loading animation duration in ms

    const updateProgress = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const rawProgress = Math.min(100, Math.floor((elapsedTime / duration) * 100));

      setProgress(rawProgress);

      if (rawProgress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        setIsCompleted(true);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Popup transition & navigation execution when 100% is reached
  useEffect(() => {
    if (isCompleted) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
        const navTimer = setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else if (!preventRedirect) {
            if (redirectTo) {
              router.replace(redirectTo);
            } else {
              const session = authStore.getSession();
              if (!session) {
                router.replace("/login");
              } else if (session.role === "Advisor") {
                router.replace("/dashboard");
              } else {
                router.replace("/queue");
              }
            }
          }
        }, 550);
        return () => clearTimeout(navTimer);
      }, 400);

      return () => clearTimeout(exitTimer);
    }
  }, [isCompleted, onComplete, preventRedirect, redirectTo, router]);

  // Calculate current active milestone based on progress %
  const currentMilestone =
    [...MILESTONES].reverse().find((m) => progress >= m.minProgress) || MILESTONES[0];

  // Dynamic checklist completion states based on continuous progress %
  const isIdentityDone = progress >= 28;
  const isPortfolioDone = progress >= 58;
  const isAuditingDone = progress >= 88;

  return (
    <div className="bg-[#080c0a] text-slate-100 min-h-screen flex flex-col justify-between font-sans selection:bg-brand-emerald selection:text-black overflow-hidden relative w-full">
      {/* Ambient background glow & animated grid */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-80" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-10 right-1/4 w-60 h-60 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none animate-pulse-slow" style={{ animationDelay: "1.5s" }} />

      {/* Header */}
      <header className="relative z-10 w-full px-6 pt-7 pb-4 flex items-center justify-between border-b border-white/5">
        <CompanyLogo />

        {/* Security Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="tracking-wide uppercase">TLS 1.3 Secure</span>
        </div>
      </header>

      {/* Main Content / Loader Card with Popup Exit Animation */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 max-w-md mx-auto w-full py-8">
        <div
          className={cn(
            "w-full bg-[#0d1511]/90 backdrop-blur-xl border rounded-2xl p-7 shadow-2xl transition-all duration-500 flex flex-col items-center text-center relative overflow-hidden",
            isCompleted
              ? "border-emerald-400/80 shadow-[0_0_70px_rgba(34,197,94,0.5)] scale-[1.03]"
              : "border-emerald-500/20 glow-glow",
            isExiting && "animate-popup-out"
          )}
        >
          {/* Top subtle highlight line */}
          <div
            className={cn(
              "absolute top-0 inset-x-0 h-[2px] transition-all duration-500",
              isCompleted
                ? "bg-gradient-to-r from-emerald-500 via-[#4ade80] to-emerald-500"
                : "bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
            )}
          />

          {/* Animated Central Loader Orb, Orbiting Particles & Rings */}
          <div className="relative w-32 h-32 my-4 flex items-center justify-center">
            {/* Radar Wave Pulses */}
            <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-radar" />
            <div
              className="absolute inset-2 rounded-full border border-emerald-400/20 animate-radar"
              style={{ animationDelay: "1.2s" }}
            />

            {/* Orbiting Particle Dot Container */}
            <div className="absolute inset-0 rounded-full animate-spin-slow pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#4ade80] absolute -top-1 left-1/2 -translate-x-1/2 animate-pulse" />
            </div>

            {/* Outer Rotating Dashed Ring */}
            <div
              className={cn(
                "absolute inset-0 rounded-full border-2 border-dashed transition-colors duration-500",
                isCompleted
                  ? "border-emerald-400 opacity-90"
                  : "border-emerald-500/40 animate-spin-slow"
              )}
            />

            {/* Middle Counter-rotating segmented track */}
            <div className="absolute inset-2.5 rounded-full border-2 border-transparent border-t-emerald-400 border-r-emerald-500/30 animate-spin-reverse" />

            {/* Inner Glow Circle with Brand Logo Icon or Shield Icon */}
            <div
              className={cn(
                "w-16 h-16 rounded-full bg-gradient-to-br border flex items-center justify-center shadow-lg relative transition-all duration-500",
                isCompleted
                  ? "from-[#174427] to-[#0d2817] border-emerald-400 shadow-emerald-400/50 scale-110"
                  : "from-[#122b1c] to-[#0a1810] border-emerald-400/40 shadow-emerald-500/20"
              )}
            >
              {isCompleted ? (
                <ShieldCheck className="w-9 h-9 text-[#4ade80] animate-check-pop" />
              ) : (
                <AILogo className="w-8 h-8 animate-pulse" />
              )}
            </div>
          </div>

          {/* Status Title & Shimmer Dots */}
          <h2 className="text-xl font-bold tracking-tight text-white mt-3 flex items-center gap-2">
            <span className={cn(isCompleted ? "text-emerald-300" : "text-white")}>
              {isCompleted ? "Access Granted" : title}
            </span>
            {!isCompleted ? (
              <span className="inline-flex space-x-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/40 animate-check-pop">
                100% READY
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-2 min-h-[36px] max-w-xs transition-opacity duration-300">
            {currentMilestone.desc}
          </p>

          {/* Active Role Pill */}
          <div className="mt-3 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16291e] border border-emerald-500/30 text-[11px] font-semibold tracking-wider text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              {sessionRole || "ADVISOR PORTAL ACCESS"}
            </span>
          </div>

          {/* Continuous Fluid Linear Progress Bar & Animated Counter */}
          <div className="w-full mt-6 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 animate-check-pop" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                )}
                <span className={cn(isCompleted ? "text-emerald-300 font-semibold" : "text-slate-300")}>
                  {currentMilestone.step}
                </span>
              </span>
              <span className="text-emerald-400 font-bold text-sm tracking-wider">
                {progress}%
              </span>
            </div>

            {/* Track & Liquid Animated Striped Fill */}
            <div className="w-full h-2 rounded-full bg-slate-800/80 p-[1px] overflow-hidden border border-emerald-950 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-[#4ade80] progress-bar-stripes transition-all duration-75 ease-linear shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Multi-step Micro Status Checklist with Dynamic Real-time Animations */}
          <div className="w-full mt-6 pt-5 border-t border-white/5 grid grid-cols-3 gap-2 text-left">
            <div
              className={`flex flex-col items-center text-center p-2 rounded-lg border transition-all duration-300 ${
                isIdentityDone
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/[0.02] border-white/5 opacity-60"
              }`}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-1 font-bold transition-all",
                  isIdentityDone
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 animate-check-pop"
                    : "bg-slate-800 text-slate-500"
                )}
              >
                {isIdentityDone ? "✓" : "1"}
              </div>
              <span className="text-[10px] font-medium text-slate-300">Identity</span>
              <span className={cn("text-[9px]", isIdentityDone ? "text-emerald-400" : "text-slate-500")}>
                {isIdentityDone ? "Confirmed" : "Verifying"}
              </span>
            </div>

            <div
              className={`flex flex-col items-center text-center p-2 rounded-lg border transition-all duration-300 ${
                isPortfolioDone
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/[0.02] border-white/5 opacity-60"
              }`}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-1 font-bold transition-all",
                  isPortfolioDone
                    ? "bg-emerald-500 text-black animate-check-pop"
                    : "bg-slate-800 text-slate-500"
                )}
              >
                {isPortfolioDone ? "✓" : "2"}
              </div>
              <span className="text-[10px] font-medium text-emerald-200">Documents</span>
              <span className={cn("text-[9px]", isPortfolioDone ? "text-emerald-400" : "text-slate-500")}>
                {isPortfolioDone ? "Decrypted" : "Decrypting"}
              </span>
            </div>

            <div
              className={`flex flex-col items-center text-center p-2 rounded-lg border transition-all duration-300 ${
                isAuditingDone
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/[0.01] border-white/5 opacity-60"
              }`}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-1 font-bold transition-all",
                  isAuditingDone
                    ? "bg-emerald-500 text-black animate-check-pop"
                    : "bg-slate-800 text-slate-500"
                )}
              >
                {isAuditingDone ? "✓" : "3"}
              </div>
              <span className="text-[10px] font-medium text-slate-400">Auditing</span>
              <span className={cn("text-[9px]", isAuditingDone ? "text-emerald-400 font-medium" : "text-slate-500")}>
                {isAuditingDone ? "Verified" : "Queued"}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full px-6 py-3.5 border-t border-white/5 text-center flex justify-center items-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-100 font-medium text-[11px] tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <span className="font-semibold text-emerald-200">Springer Capital Institutional Compliance &amp; Document Review Platform</span>
          <span className="text-emerald-500/60 hidden sm:inline">•</span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/50 text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.3)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Strictly Confidential
          </span>
        </div>
      </footer>
    </div>
  );
}
