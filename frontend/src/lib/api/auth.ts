/**
 * DOCU: Provides frontend API requests for authentication endpoints.
 * Last Updated Date: September 3, 2026
 * @returns Normalized signup and login API responses.
 * @author Keith
 */
import { client } from "./client";
import type { SignupInput, LoginInput } from "@/lib/validation/auth";
import type { AuthEnvelope, AuthApiResponse } from "@/types/auth.types";

/**
 * DOCU: Sends validated signup data to the backend authentication endpoint.
 * Last Updated Date: September 3, 2026
 * @param data - Signup fields submitted by the user.
 * @returns Normalized authentication response containing user data and token.
 * @author Keith
 */
export async function signupRequest(data: SignupInput): Promise<AuthApiResponse> {
  // POST /auth/signup — fields: { name, email, password, role }
  const envelope = await client.post<AuthEnvelope>("/auth/signup", data);
  return {
    token: envelope.data.token,
    user: {
      id: envelope.data.user.id,
      name: envelope.data.user.name,
      email: envelope.data.user.email,
      role: envelope.data.user.role,
    },
    message: envelope.message,
  };
}

/**
 * DOCU: Sends login credentials to the backend authentication endpoint.
 * Last Updated Date: September 3, 2026
 * @param data - Login credentials submitted by the user.
 * @returns Normalized authentication response containing user data and token.
 * @author Keith
 */
export async function loginRequest(data: LoginInput): Promise<AuthApiResponse> {
  // POST /auth/login — fields: { email, password }
  const envelope = await client.post<AuthEnvelope>("/auth/login", data);
  return {
    token: envelope.data.token,
    user: {
      id: envelope.data.user.id,
      name: envelope.data.user.name,
      email: envelope.data.user.email,
      role: envelope.data.user.role,
    },
    message: envelope.message,
  };
}

/**
 * DOCU: Sends updated user profile settings to the backend endpoint.
 * Last Updated Date: September 22, 2026
 * @param data - User profile data to update.
 * @returns Updated user profile response.
 */
export async function updateProfileRequest(data: { name: string }): Promise<{ user: { id: string; name: string; email: string; role: any }; message?: string }> {
  // PUT /auth/profile — fields: { name }
  const envelope = await client.put<{ data: { user: { id: string; name: string; email: string; role: any } }; message?: string }>("/auth/profile", data);
  return {
    user: envelope.data.user,
    message: envelope.message,
  };
}

/**
 * DOCU: Fetches the current authenticated user's profile from the backend.
 * Last Updated Date: September 22, 2026
 * @returns Current user profile.
 */
export async function getMeRequest(): Promise<{ user: { id: string; name: string; email: string; role: any } }> {
  const envelope = await client.get<{ data: { user: { id: string; name: string; email: string; role: any } } }>("/auth/me");
  return envelope.data;
}
