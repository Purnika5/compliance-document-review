"use client";

/**
 * DOCU: Renders the left brand showcase pane for Springer Capital auth screens.
 * Features institutional branding, hero typography with pure white text, and 3 feature cards.
 * Last Updated Date: September 15, 2026
 * @author Keith
 */
import React from "react";
import { AILogo } from "@/components/ui/brand-logos";
import { DollarSign, Globe, Building2 } from "lucide-react";

export function AuthBrandSide() {
  return (
    <div className="relative flex flex-col justify-between h-full min-h-[540px] lg:min-h-screen w-full p-8 lg:p-12 xl:p-14 bg-[#183028] text-white overflow-hidden select-none font-sans">
      {/* Background Dot Grid Pattern Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(rgba(163, 230, 53, 0.2) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Ambient Radial Glows */}
      <div className="absolute top-12 left-12 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-80 h-80 bg-[#84cc16]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Brand Logo */}
      <div className="relative z-10 w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AILogo className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
              Springer Capital
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.16em] uppercase text-white/90">
              Real Estate Investment &amp; Advisory
            </span>
          </div>
        </div>
      </div>

      {/* Center Body / Hero & 3 Feature Cards */}
      <div className="relative z-10 space-y-6 w-full max-w-2xl xl:max-w-3xl my-auto py-8">
        {/* Hero Section */}
        <div className="space-y-3.5">


          <h1 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-bold text-white tracking-tight leading-[1.12]">
            Global Real Estate<br />
            Investment,<br />
            <span className="text-white relative inline-block">
              Optimized.
              {/* Wavy Underline */}
              <svg
                className="absolute -bottom-2 left-0 w-full h-2.5 text-[#a3e635] overflow-visible"
                viewBox="0 0 160 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 7C14 2 26 12 38 7C50 2 62 12 74 7C86 2 98 12 110 7C122 2 134 12 146 7C152 4.5 158 4.5 160 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="text-xs sm:text-sm lg:text-[15px] text-white/90 leading-relaxed pt-1 max-w-2xl">
            With operations in North America and Asia, Springer Capital serves at the intersection of
            direct investment and advisory services, focusing on world-class real estate opportunities.
          </p>
        </div>

        {/* Feature Highlights Cards */}
        <div className="space-y-3 pt-2 w-full">
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xs flex items-start gap-4 hover:bg-white/[0.07] transition-all duration-200">
            <div className="h-8 w-8 rounded-lg bg-emerald-950/90 border border-emerald-500/30 flex items-center justify-center text-white shrink-0 mt-0.5">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white">Direct Real Estate Investment</h3>
              <p className="text-[11px] sm:text-xs text-white/80 leading-relaxed">
                World-class real estate opportunities and innovative capital solutions across North America &amp; Asia.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xs flex items-start gap-4 hover:bg-white/[0.07] transition-all duration-200">
            <div className="h-8 w-8 rounded-lg bg-emerald-950/90 border border-emerald-500/30 flex items-center justify-center text-white shrink-0 mt-0.5">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white">Advisory &amp; Asset Optimization</h3>
              <p className="text-[11px] sm:text-xs text-white/80 leading-relaxed">
                Full advisory services including property management, cash flow optimization, and capital restructuring.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xs flex items-start gap-4 hover:bg-white/[0.07] transition-all duration-200">
            <div className="h-8 w-8 rounded-lg bg-emerald-950/90 border border-emerald-500/30 flex items-center justify-center text-white shrink-0 mt-0.5">
              <Globe className="h-4 w-4" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white">Global Capital Markets</h3>
              <p className="text-[11px] sm:text-xs text-white/80 leading-relaxed">
                Access to debt &amp; equity capital markets, acquisition financing, and institutional structuring.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between gap-4 text-[11px] sm:text-xs text-white/90 w-full font-medium">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />
          <span>Chicago Metropolitan Area • Shanghai</span>
        </div>
        <span className="text-right">Institutional Compliance &amp; Secure Data</span>
      </div>
    </div>
  );
}
