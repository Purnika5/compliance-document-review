/**
 * DOCU: Provides the shared HTTP client with auth headers and API error handling.
 * Last Updated Date: September 3, 2026
 * @returns Configured request helpers for frontend API calls.
 * @author Keith
 */
import { authStore } from "@/lib/auth/auth-store";

export const getBaseBackendUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  return "https://compliance-document-review-494m.onrender.com";
};

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

    const base = getBaseBackendUrl();
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith("http") ? endpoint : `${base}${cleanEndpoint}`;

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

      const isConnectionRefused =
        err instanceof TypeError && err.message === "Failed to fetch";

      const message = isConnectionRefused
        ? "Unable to reach the server. Please check that the backend is running and try again."
        : err instanceof Error
          ? err.message
          : "An unexpected network error occurred. Please try again.";

      throw new ApiError(isConnectionRefused ? 503 : 500, message);
    }
  },

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  patch<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },
};
