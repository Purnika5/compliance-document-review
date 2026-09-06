import React from "react";
import Link from "next/link";
import { CompanyLogo } from "@/components/ui/brand-logos";

/**
 * DOCU: Provides shared navigation and layout for authentication screens.
 * Last Updated Date: September 7, 2026
 * @param children - Login or signup page content.
 * @returns The authentication layout.
 * @author Keith
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "hsl(222 70% 94%)" }}>

      {/* ── Animated Background Orbs ─────────────────────────────────── */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full animate-orb-float"
        style={{
          background: "radial-gradient(circle, hsl(239 72% 52% / 0.12) 0%, transparent 70%)",
          animationDelay: "0s",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full animate-orb-float"
        style={{
          background: "radial-gradient(circle, hsl(190 80% 55% / 0.10) 0%, transparent 70%)",
          animationDelay: "2.5s",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full animate-orb-float"
        style={{
          background: "radial-gradient(circle, hsl(326 72% 61% / 0.06) 0%, transparent 65%)",
          animationDelay: "4.5s",
        }}
      />

      {/* ── Glassy Header ────────────────────────────────────────────── */}
      <header className="relative z-10 h-14 border-b border-white/60 bg-white/50 px-4 sm:px-6 flex items-center justify-between backdrop-blur-xl shadow-sm">
        <Link href="/" className="flex items-center">
          <CompanyLogo />
        </Link>
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <Link
            href="/login"
            className="text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md transition-colors hover:bg-white/60"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="bg-[hsl(239_72%_52%)] hover:bg-[hsl(239_72%_46%)] text-white px-3 py-1.5 rounded-md transition-all shadow-sm hover:shadow-md hover:-translate-y-px"
          >
            Register Personnel
          </Link>
        </div>
      </header>

      {/* ── Centered Auth Card Area ───────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center py-10 px-4 sm:px-6">
        <div className="w-full max-w-md animate-slide-up">{children}</div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-slate-400 border-t border-white/50 bg-white/30 backdrop-blur-sm">
        Springer Capital Institutional Compliance &amp; Wealth Advisory Platform • Strictly Confidential
      </footer>
    </div>
  );
}
