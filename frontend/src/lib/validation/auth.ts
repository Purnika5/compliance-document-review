/**
 * DOCU: Defines Zod schemas and validation helpers for authentication forms (Login and Signup).
 * Last Updated Date: September 7, 2026
 * @returns Shared authentication validation contracts.
 * @author Keith
 */
import { z } from "zod";

/**
 * DOCU: Zod schema and inferenced type for selectable user roles during registration.
 */
export const roleEnum = z.enum(["Advisor", "Officer"]);
export type Role = z.infer<typeof roleEnum>;

/**
 * DOCU: Display name validation schema requiring minimum 2 characters.
 */
export const nameSchema = z.string().min(2, "Name must be at least 2 characters long");

export const isInstitutionalEmail = (email: string): boolean => {
  const lower = email.toLowerCase().trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(springer\.capital|springercapital\.com)$/i;
  return emailRegex.test(lower);
};

/**
 * DOCU: Corporate / Institutional email validation schema.
 */
export const emailSchema = z
  .string()
  .min(1, "Institutional email is required")
  .email("Please enter a valid institutional email address")
  .refine(
    isInstitutionalEmail,
    "Please enter a valid institutional email address (@springer.capital or @springercapital.com)"
  );

/**
 * DOCU: Secure password validation schema requiring minimum 8 characters.
 */
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters long");

/**
 * DOCU: Personnel registration schema validating name, corporate email, organization, passwords, and assigned role.
 */
export const signupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    organization: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: roleEnum.default("Advisor"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * DOCU: Login credential schema validating email and password presence.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Field-level Validation Checkers for real-time validation
/**
 * DOCU: Validates a user's display name for the signup form.
 * Last Updated Date: September 7, 2026
 * @param name - Display name to validate.
 * @returns Validation success and optional error message.
 * @author Keith
 */
export function validateName(name: string): { success: boolean; error?: string } {
  const res = nameSchema.safeParse(name);
  return res.success ? { success: true } : { success: false, error: res.error.issues[0]?.message };
}

/**
 * DOCU: Validates an email address for authentication forms.
 * Last Updated Date: September 7, 2026
 * @param email - Email address to validate.
 * @returns Validation success and optional error message.
 * @author Keith
 */
export function validateEmail(email: string): { success: boolean; error?: string } {
  const res = emailSchema.safeParse(email);
  return res.success ? { success: true } : { success: false, error: res.error.issues[0]?.message };
}

/**
 * DOCU: Validates password requirements for authentication forms.
 * Last Updated Date: September 7, 2026
 * @param password - Password value to validate.
 * @returns Validation success and optional error message.
 * @author Keith
 */
export function validatePassword(password: string): { success: boolean; error?: string } {
  const res = passwordSchema.safeParse(password);
  return res.success ? { success: true } : { success: false, error: res.error.issues[0]?.message };
}

/**
 * DOCU: Confirms that the password confirmation matches the password.
 * Last Updated Date: September 7, 2026
 * @param password - Original password value.
 * @param confirmPassword - Confirmation value to compare.
 * @returns Validation success and optional error message.
 * @author Keith
 */
export function validateConfirmPassword(password: string, confirmPassword: string): { success: boolean; error?: string } {
  if (!confirmPassword) return { success: false, error: "Please confirm your password" };
  if (password !== confirmPassword) return { success: false, error: "Passwords do not match" };
  return { success: true };
}
