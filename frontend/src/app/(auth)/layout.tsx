import React from "react";
import { AuthBrandSide } from "@/features/auth/components/auth-brand-side";

/**
 * DOCU: Provides split-screen layout for authentication screens (Login and Registration).
 * Matches the institutional Springer Capital design with left showcase panel and clean right form.
 * Last Updated Date: September 15, 2026
 * @param children - Login or signup page content.
 * @returns The split-screen authentication layout.
 * @author Keith
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0e271c]">
      {/* Left Brand Showcase Panel */}
      <div className="w-full lg:w-[48%] xl:w-[46%] min-h-[500px] lg:min-h-screen lg:sticky lg:top-0 shrink-0">
        <AuthBrandSide />
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 min-h-screen bg-white text-slate-900 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 relative overflow-y-auto">
        {/* Center Form Container */}
        <div className="w-full max-w-[480px] mx-auto my-auto py-6">
          <div className="border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="w-full text-center text-[11px] text-slate-400 select-none pt-4">
          Springer Capital • North America &amp; Asia • Version 2.4.0
        </div>
      </div>
    </div>
  );
}

