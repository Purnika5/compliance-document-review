/**
 * DOCU: Provides the shared HTTP client with auth headers and API error handling.
 * Last Updated Date: September 3, 2026
 * @returns Configured request helpers for frontend API calls.
 * @author Keith
 */
import { authStore } from "@/lib/auth/auth-store";

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "[client.ts] NEXT_PUBLIC_API_URL is not defined. " +
    "Copy .env.example to .env.local and set the value."
  );
}

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL;


export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export const client = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = authStore.getToken();

    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {
      // Don't set Content-Type for FormData — browser sets it automatically with the correct boundary
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith("http") ? endpoint : `${BASE_API_URL}${endpoint}`;

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        let errorData: unknown;
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
          errorData = await response.json();
          if (typeof errorData === "object" && errorData !== null && "message" in errorData) {
            errorMessage = String((errorData as { message: string }).message);
          }
        } catch {
          // ignore non-json error payloads
        }

        if (response.status === 401 || response.status === 403) {
          // Trigger unauthorized event/logging if needed
        }

        throw new ApiError(response.status, errorMessage, errorData);
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, err instanceof Error ? err.message : "Network error occurred");
    }
  },

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
