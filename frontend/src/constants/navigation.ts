/**
 * DOCU: Sidebar navigation items mapped by role (Advisor, Officer, Admin).
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { RoleType } from "@/entities/enums/auth.enum";

export interface NavItem {
  title: string;
  href: string;
  iconName: "FileText" | "CheckSquare" | "Clock" | "Upload" | "BarChart3" | "Settings";
  badge?: string;
}

export const NAVIGATION_CONFIG: Record<RoleType, NavItem[]> = {
  Advisor: [
    {
      title: "Dashboard",
      href: "/dashboard",
      iconName: "FileText",
    },
    {
      title: "Upload Document",
      href: "/dashboard?upload=true",
      iconName: "Upload",
    },
  ],
  Officer: [
    {
      title: "Review Queue",
      href: "/queue",
      iconName: "CheckSquare",
    },
    {
      title: "Audit Trail",
      href: "/queue",
      iconName: "Clock",
    },
  ],
  Admin: [
    {
      title: "Review Queue",
      href: "/queue",
      iconName: "CheckSquare",
    },
    {
      title: "My Submissions",
      href: "/submissions",
      iconName: "FileText",
    },
    {
      title: "Analytics",
      href: "/queue",
      iconName: "BarChart3",
    },
  ],
};
