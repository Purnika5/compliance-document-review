/**
 * DOCU: Provides branded Springer Capital and AI logo components optimized for institutional dark mode.
 * Last Updated Date: September 10, 2026
 * @returns Reusable branded logo views.
 * @author Keith
 */
import React from "react";
import { cn } from "@/lib/utils";

/**
 * AI Logo: Springer Capital's four-lobed brand mark with distinct green gradients
 * matching the official 4-shade green brand palette:
 * - Top: Medium Leaf Green (#438538)
 * - Right: Deep Dark Forest Green (#266916)
 * - Bottom: Olive Moss Green (#5E9334)
 * - Left: Bright Chartreuse / Lime Green (#A2D120)
 */
export function AILogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 drop-shadow-[0_2px_8px_rgba(79,143,69,0.25)]", className)}
    >
      {/* Top Petal - Medium Leaf Green */}
      <path
        d="M 100,94 C 84,78 72,64 72,48 C 72,32.5 84.5,20 100,20 C 115.5,20 128,32.5 128,48 C 128,64 116,78 100,94 Z"
        fill="#438538"
      />
      {/* Right Petal - Deep Dark Forest Green */}
      <path
        d="M 100,94 C 84,78 72,64 72,48 C 72,32.5 84.5,20 100,20 C 115.5,20 128,32.5 128,48 C 128,64 116,78 100,94 Z"
        fill="#266916"
        transform="rotate(90 100 100)"
      />
      {/* Bottom Petal - Olive Moss Green */}
      <path
        d="M 100,94 C 84,78 72,64 72,48 C 72,32.5 84.5,20 100,20 C 115.5,20 128,32.5 128,48 C 128,64 116,78 100,94 Z"
        fill="#5E9334"
        transform="rotate(180 100 100)"
      />
      {/* Left Petal - Bright Lime / Chartreuse */}
      <path
        d="M 100,94 C 84,78 72,64 72,48 C 72,32.5 84.5,20 100,20 C 115.5,20 128,32.5 128,48 C 128,64 116,78 100,94 Z"
        fill="#A2D120"
        transform="rotate(270 100 100)"
      />
    </svg>
  );
}

export function CompanyLogo({
  className,
  showIcon = true,
  inverted = false,
}: {
  className?: string;
  showIcon?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {showIcon && <AILogo className="h-7 w-7 sm:h-8 sm:w-8" />}
      <div className="flex items-baseline text-lg sm:text-xl tracking-tight uppercase">
        <span
          className={cn(
            "font-extrabold tracking-wide font-sans transition-colors",
            inverted ? "text-white" : "text-[#183028]"
          )}
        >
          Springer
        </span>
        <span
          className={cn(
            "font-semibold ml-1.5 font-sans tracking-wider text-[0.88em] transition-colors",
            inverted ? "text-[#C5E86C]" : "text-[#183028]"
          )}
        >
          Capital
        </span>
      </div>
    </div>
  );
}
