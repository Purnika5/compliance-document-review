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
