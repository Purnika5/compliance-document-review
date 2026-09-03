import React from "react";
import { cn } from "@/lib/utils";

/**
 * AI Logo (Image 2): Overlapping Mint Teal + Royal Indigo + Dark Navy geometric mark
 */
export function AILogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      {/* Left Rounded Hexagon / Shield - Mint Teal */}
      <path
        d="M 85 40 L 40 65 C 32 70 32 82 40 87 L 40 120 C 40 135 55 160 85 160 C 105 160 120 142 120 125 L 85 40 Z"
        fill="#00d5a3"
      />
      {/* Right Rounded Shape - Royal Indigo */}
      <path
        d="M 115 45 C 135 45 165 55 165 80 L 165 125 C 165 148 135 158 115 158 C 95 158 75 140 75 120 L 115 45 Z"
        fill="#4f46e5"
      />
      {/* Overlapping Dark Navy Triangle Intersection */}
      <path
        d="M 120 62 L 72 102 L 132 140 C 138 128 138 78 120 62 Z"
        fill="#1e1b4b"
      />
    </svg>
  );
}

/**
 * Company Brand Logo (Image 3): "Springer Capital" wordmark + brand icon
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
      <div className="flex items-baseline font-serif text-xl tracking-tight">
        <span className="font-bold text-[#438c44]">Springer</span>
        <span className="font-normal text-[#4f46e5] ml-1.5 font-sans">Capital</span>
      </div>
    </div>
  );
}
