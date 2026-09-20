/**
 * DOCU: Centralized API Client with Bearer token injection, request/response interceptors, and typed errors.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { authStore } from "@/lib/auth/auth-store";

const getBaseApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (
    process.env.NODE_ENV === "production" ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost")
  ) {
    return "https://compliance-document-review-494m.onrender.com/api";
  }
  return "http://localhost:5000/api";
};

const BASE_API_URL = getBaseApiUrl();

/**
 * DOCU: Custom error class wrapping HTTP response errors and structured API error data.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * DOCU: Request configuration options extending standard RequestInit with query params and auth controls.
 */
export interface RequestOptions extends RequestInit {
  /** Optional URL query parameters. */
  params?: Record<string, string | number | boolean | undefined>;
  /** When true, omits the Authorization Bearer header. */
  skipAuth?: boolean;
}

/**
 * DOCU: HTTP client instance managing base URL resolution, headers, and request execution.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export class APIClient {
  private baseUrl: string;

  constructor(baseEndpoint = "") {
    this.baseUrl = baseEndpoint.startsWith("http")
      ? baseEndpoint
      : `${BASE_API_URL}${baseEndpoint}`;
  }

  /**
   * DOCU: Constructs a full URL string appending serialized query parameters.
   * @param endpoint - Target API path.
   * @param params - Optional query parameter dictionary.
   * @returns Fully qualified URL string.
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const fullUrl = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${cleanEndpoint}`;
    
    if (!params) return fullUrl;

    const url = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }

  /**
   * DOCU: Executes an HTTP fetch request with auth injection and response interceptors.
   * Last Updated Date: September 7, 2026
   * @param endpoint - API route endpoint.
   * @param options - Request options including body, method, and query params.
   * @returns Parsed JSON response of type T.
   * @author Keith
   */
  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, skipAuth = false, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const isFormData = fetchOptions.body instanceof FormData;

    // --- 1. Request Interceptor: Attach Authorization Header ---
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (!skipAuth) {
      const token = authStore.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, { ...fetchOptions, headers });

      // --- 2. Response Interceptor: Error Handling & Status Checks ---
      if (!response.ok) {
        let errorData: unknown;
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
          errorData = await response.json();
          if (typeof errorData === "object" && errorData !== null && "message" in errorData) {
            errorMessage = String((errorData as { message: string }).message);
          }
        } catch {
          // ignore non-json body
        }

        // Auto Session Invalidation on 401
        if (response.status === 401 && !skipAuth) {
          authStore.clearSession();
        }

        throw new ApiError(response.status, errorMessage, errorData);
      }

      // Safe JSON parsing
      const json = await response.json();
      return json as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, err instanceof Error ? err.message : "Network request failed");
    }
  }

  /**
   * DOCU: Performs an HTTP GET request.
   * Last Updated Date: September 7, 2026
   * @param endpoint - Path to GET.
   * @param options - Optional request parameters.
   * @returns Promise resolving to response data.
   * @author Keith
   */
  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * DOCU: Performs an HTTP POST request.
   * Last Updated Date: September 7, 2026
   * @param endpoint - Path to POST.
   * @param body - Request payload.
   * @param options - Optional request parameters.
   * @returns Promise resolving to response data.
   * @author Keith
   */
  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  /**
   * DOCU: Performs an HTTP PATCH request.
   * Last Updated Date: September 7, 2026
   * @param endpoint - Path to PATCH.
   * @param body - Request payload.
   * @param options - Optional request parameters.
   * @returns Promise resolving to response data.
   * @author Keith
   */
  public patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  /**
   * DOCU: Performs an HTTP PUT request.
   * Last Updated Date: September 7, 2026
   * @param endpoint - Path to PUT.
   * @param body - Request payload.
   * @param options - Optional request parameters.
   * @returns Promise resolving to response data.
   * @author Keith
   */
  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  /**
   * DOCU: Performs an HTTP DELETE request.
   * Last Updated Date: September 7, 2026
   * @param endpoint - Path to DELETE.
   * @param options - Optional request parameters.
   * @returns Promise resolving to response data.
   * @author Keith
   */
  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

// Global Singleton API Client
export const apiClient = new APIClient();
