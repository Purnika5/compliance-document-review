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
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-xs text-muted-foreground">
      <Link
        href="/"
        className="flex items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#062A20] hover:text-[#54d0a2]"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {breadcrumbs.slice(1).map((item, index) => {
        const isLast = index === breadcrumbs.length - 2;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" aria-hidden="true" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors truncate max-w-[140px] sm:max-w-[180px] hover:bg-[#062A20] hover:text-[#54d0a2]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="rounded-md border border-border bg-card/70 px-2 py-0.5 text-xs font-medium text-foreground truncate max-w-[180px] sm:max-w-[260px]">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
