"use client";

/**
 * DOCU: Renders navigational breadcrumbs for the current route.
 * Last Updated Date: September 3, 2026
 * @returns The breadcrumb navigation view.
 * @author Keith
 */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbsProps {
  customItems?: Array<{ label: string; href?: string }>;
}

export function Breadcrumbs({ customItems }: BreadcrumbsProps) {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    if (customItems) return [...customItems];

    const segments = pathname.split("/").filter(Boolean);
    const items: Array<{ label: string; href?: string }> = [
      { label: "Home", href: "/" },
    ];

    if (segments.length === 0) {
      return items;
    }

    if (segments[0] === "submissions") {
      items.push({ label: "Advisor Workspace", href: "/submissions" });
    } else if (segments[0] === "queue") {
      items.push({ label: "Compliance Review Queue", href: "/queue" });
    } else if (segments[0] === "documents") {
      items.push({ label: "Documents", href: "/queue" });
      if (segments[1]) {
        items.push({ label: segments[1] });
      }
    } else {
      segments.forEach((seg, index) => {
        const url = `/${segments.slice(0, index + 1).join("/")}`;
        items.push({
          label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
          href: index === segments.length - 1 ? undefined : url,
        });
      });
    }

    return items;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-blue-900">
      <Link
        href="/"
        className="flex items-center gap-1 rounded-md p-1 text-blue-500 transition-colors hover:bg-white/70 hover:text-blue-900"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5 text-slate-400" />
      </Link>

      {breadcrumbs.slice(1).map((item, index) => {
        const isLast = index === breadcrumbs.length - 2;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="h-3 w-3 text-blue-300 shrink-0" aria-hidden="true" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="rounded-md px-2 py-1 font-medium text-blue-700 transition-colors truncate max-w-[150px] sm:max-w-[200px] hover:bg-white/70 hover:text-blue-950"
              >
                {item.label}
              </Link>
            ) : (
              <span className="rounded-md border border-blue-200 bg-white/80 px-2.5 py-1 font-bold text-blue-950 shadow-sm truncate max-w-[180px] sm:max-w-[260px]">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
