/**
 * DOCU: Renders navigational breadcrumbs for the current route adhering to dark mode.
 * Last Updated Date: September 8, 2026
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

    if (segments[0] === "dashboard") {
      items.push({ label: "Advisor Workspace", href: "/dashboard" });
      items.push({ label: "Dashboard" });
    } else if (segments[0] === "submissions") {
      items.push({ label: "Advisor Workspace", href: "/dashboard" });
      items.push({ label: "My Documents" });
    } else if (segments[0] === "queue") {
      items.push({ label: "Compliance Review Queue", href: "/queue" });
    } else if (segments[0] === "documents") {
      items.push({ label: "Advisor Workspace", href: "/dashboard" });
      items.push({ label: "Documents" });
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
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs">
      <Link
        href="/"
        className="flex items-center text-slate-400 transition-colors hover:text-slate-800"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.slice(1).map((item, index) => {
        const isLast = index === breadcrumbs.length - 2;
        return (
          <React.Fragment key={index}>
            <span className="text-slate-300 select-none text-xs">/</span>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 truncate max-w-[160px]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
