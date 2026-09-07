import React from "react";
import Link from "next/link";
import { CompanyLogo } from "@/components/ui/brand-logos";

/**
 * DOCU: Provides shared navigation and layout for authentication screens in institutional dark mode.
 * Last Updated Date: September 8, 2026
 * @param children - Login or signup page content.
 * @returns The authentication layout.
 * @author Keith
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Subtle institutional hairline grid overlay (clean fintech precision, no AI slop) */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#26262615_1px,transparent_1px),linear-gradient(to_bottom,#26262615_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]"
      />

      {/* Top subtle brand glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-[600px] rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Glassy Header */}
      <header className="relative z-10 h-14 border-b border-border/70 bg-card/60 px-4 sm:px-6 flex items-center justify-between backdrop-blur-xl">
        <Link href="/" className="flex items-center">
          <CompanyLogo />
        </Link>
        <div className="flex items-center space-x-2 text-xs font-medium">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-[#54d0a2] px-3 py-1.5 rounded-md transition-colors bg-transparent hover:bg-[#062A20]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white font-semibold px-3 py-1.5 rounded-md transition-all shadow-xs hover:-translate-y-px"
          >
            Register Personnel
          </Link>
        </div>
      </header>

      {/* Centered Auth Card Area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center py-10 px-4 sm:px-6">
        <div className="w-full max-w-md animate-slide-up">{children}</div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-muted-foreground/60 border-t border-border/50 bg-card/30 backdrop-blur-sm">
        Springer Capital Institutional Compliance &amp; Wealth Advisory Platform • Strictly Confidential
      </footer>
    </div>
  );
}
