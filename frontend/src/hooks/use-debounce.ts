"use client";

/**
 * DOCU: Generic value debounce hook to throttle rapid state updates (e.g. search query inputs).
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { useState, useEffect } from "react";

/**
 * DOCU: Debounces any changing input value by the specified duration in milliseconds.
 * Last Updated Date: September 7, 2026
 * @param value - State value to debounce.
 * @param delayMs - Debounce delay in milliseconds (default: 300ms).
 * @returns The debounced value delayed until after the timer expires.
 * @author Keith
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
