import React from "react";
import Link from "next/link";
import { CompanyLogo } from "@/components/ui/brand-logos";

/**
 * DOCU: Provides shared navigation and layout for authentication screens.
 * Last Updated Date: September 3, 2026
 * @param children - Login or signup page content.
 * @returns The authentication layout.
 * @author Keith
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <CompanyLogo />
        </Link>
        <div className="flex items-center space-x-3 text-xs font-semibold">
          <Link
            href="/login"
            className="text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded transition-colors"
          >
            Register Personnel
          </Link>
        </div>
      </header>

      {/* Centered Auth Card Area */}
      <div className="flex-1 flex flex-col justify-center items-center py-10 px-4 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        Springer Capital Institutional Compliance & Wealth Advisory Platform • Strictly Confidential
      </footer>
    </div>
  );
}
