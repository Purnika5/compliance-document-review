/**
 * DOCU: Provides branded Springer Capital and AI logo components optimized for institutional dark mode.
 * Last Updated Date: September 8, 2026
 * @returns Reusable branded logo views.
 * @author Keith
 */
import React from "react";
import { cn } from "@/lib/utils";

/**
 * AI Logo: Springer Capital's four-lobed green brand mark with emerald and chartreuse tones.
 */
export function AILogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 drop-shadow-[0_2px_8px_rgba(79,143,69,0.25)]", className)}
    >
      <circle cx="100" cy="53" r="31" fill="#4f8f45" />
      <circle cx="53" cy="100" r="31" fill="#76a92d" />
      <circle cx="147" cy="100" r="31" fill="#76a92d" />
      <circle cx="100" cy="147" r="31" fill="#4f8f45" />
      <circle cx="100" cy="100" r="22" fill="#ffffff" />
    </svg>
  );
}

/**
 * Company Brand Logo: "Springer Capital" wordmark and brand icon for dark fintech UI.
 */
export function CompanyLogo({
  className,
  showIcon = true,
}: {
  className?: string;
  showIcon?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {showIcon && <AILogo className="h-7 w-7 sm:h-8 sm:w-8" />}
      <div className="flex items-baseline text-lg sm:text-xl tracking-tight uppercase">
        <span className="font-extrabold text-foreground tracking-wide font-sans">Springer</span>
        <span className="font-semibold text-[#84c22b] ml-1.5 font-sans tracking-wider text-[0.88em]">Capital</span>
      </div>
    </div>
  );
}
