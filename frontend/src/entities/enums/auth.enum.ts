/**
 * DOCU: User authentication roles for Springer Capital compliance portal.
 * Defines supported user authorization levels (Advisor, Officer, Admin).
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export enum UserRole {
  ADVISOR = "Advisor",
  OFFICER = "Officer",
  ADMIN = "Admin",
}

export type RoleType = "Advisor" | "Officer" | "Admin";
