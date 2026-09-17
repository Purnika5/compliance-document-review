/**
 * DOCU: Authentication form validation schemas using Zod for client-side and server-side validation.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { z } from "zod";

/**
 * DOCU: Zod enum validating selectable roles during registration.
 */
export const roleEnum = z.enum(["Advisor", "Officer"]);
export type Role = z.infer<typeof roleEnum>;

/**
 * DOCU: Validates that display name has at least 2 characters.
 */
export const nameSchema = z.string().min(2, "Name must be at least 2 characters long");

/**
 * DOCU: Checks whether email belongs to institutional domain.
 */
export const isInstitutionalEmail = (email: string): boolean => {
  const lower = email.toLowerCase().trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(springer\.capital|springercapital\.com)$/i;
  return emailRegex.test(lower);
};

/**
 * DOCU: Validates corporate email format ending with @springer.capital or @springercapital.com.
 */
export const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .refine(
    isInstitutionalEmail,
    "Please enter a valid institutional email address (@springer.capital or @springercapital.com)"
  );

/**
 * DOCU: Validates minimum password complexity requirement of 8 characters.
 */
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters long");

/**
 * DOCU: Full signup registration form validation schema.
 */
export const signupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: roleEnum,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * DOCU: User login form validation schema.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * DOCU: Forgot password form schema requesting user email.
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * DOCU: Reset password confirmation schema with password matching validation.
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * DOCU: Realtime validation checker for user display name input field.
 * Last Updated Date: September 7, 2026
 * @param name - Display name string to test.
 * @returns Object with success boolean and optional error message.
 * @author Keith
 */
export function validateName(name: string): { success: boolean; error?: string } {
  const res = nameSchema.safeParse(name);
  return res.success ? { success: true } : { success: false, error: res.error.issues[0]?.message };
}

/**
 * DOCU: Realtime validation checker for corporate email address input field.
 * Last Updated Date: September 7, 2026
 * @param email - Corporate email string to test.
 * @returns Object with success boolean and optional error message.
 * @author Keith
 */
export function validateEmail(email: string): { success: boolean; error?: string } {
  const res = emailSchema.safeParse(email);
  return res.success ? { success: true } : { success: false, error: res.error.issues[0]?.message };
}

/**
 * DOCU: Realtime validation checker for password length and complexity.
 * Last Updated Date: September 7, 2026
 * @param password - Password string to test.
 * @returns Object with success boolean and optional error message.
 * @author Keith
 */
export function validatePassword(password: string): { success: boolean; error?: string } {
  const res = passwordSchema.safeParse(password);
  return res.success ? { success: true } : { success: false, error: res.error.issues[0]?.message };
}

/**
 * DOCU: Realtime validation checker confirming password and password confirmation match.
 * Last Updated Date: September 7, 2026
 * @param password - Original password value.
 * @param confirmPassword - Confirmation value.
 * @returns Object with success boolean and optional error message.
 * @author Keith
 */
export function validateConfirmPassword(password: string, confirmPassword: string): { success: boolean; error?: string } {
  if (!confirmPassword) return { success: false, error: "Please confirm your password" };
  if (password !== confirmPassword) return { success: false, error: "Passwords do not match" };
  return { success: true };
}
