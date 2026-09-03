/**
 * DOCU: Provides shared class-name composition utilities for the frontend.
 * Last Updated Date: September 3, 2026
 * @returns Utility functions for merging CSS class values.
 * @author Keith
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional CSS class names and resolves Tailwind CSS conflicts.
 */
/**
 * DOCU: Merges conditional class values and Tailwind class conflicts.
 * Last Updated Date: September 3, 2026
 * @param inputs - Class values to combine.
 * @returns A normalized CSS class string.
 * @author Keith
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
