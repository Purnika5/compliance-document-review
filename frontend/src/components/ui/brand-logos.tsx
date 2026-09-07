/**
 * DOCU: Provides branded Springer Capital and AI logo components.
 * Last Updated Date: September 3, 2026
 * @returns Reusable branded logo views.
 * @author Keith
 */
import React from "react";
import { cn } from "@/lib/utils";

/**
 * AI Logo: Springer Capital's four-lobed green brand mark.
 */
export function AILogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
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
 * Company Brand Logo: "Springer Capital" wordmark and brand icon.
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
      {showIcon && <AILogo className="h-8 w-8" />}
      <div className="flex items-baseline font-serif text-xl tracking-tight uppercase">
        <span className="font-bold text-[#3f7838]">Springer</span>
        <span className="font-normal text-[#99bd28] ml-1.5 font-sans">Capital</span>
      </div>
    </div>
  );
}
