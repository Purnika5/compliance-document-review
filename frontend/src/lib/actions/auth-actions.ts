/**
 * DOCU: Validates authentication input, calls the API, and updates the session store.
 * Last Updated Date: September 3, 2026
 * @returns Authentication action functions for signup and login.
 * @author Keith
 */
import { signupSchema, loginSchema, type SignupInput, type LoginInput } from "@/lib/validation/auth";
import { signupRequest, loginRequest } from "@/lib/api/auth";
import type { AuthApiResponse } from "@/types/auth.types";
import { authStore, type UserSession } from "@/lib/auth/auth-store";

/**
 * Orchestrates signup: validate input -> call api -> update auth store state -> return session
 */
/**
 * DOCU: Validates signup input, calls the API, and stores the returned session.
 * Last Updated Date: September 3, 2026
 * @param input - Signup form values.
 * @returns The authenticated user session.
 * @author Keith
 */
export async function signupAction(input: SignupInput): Promise<UserSession> {
  const parsed = signupSchema.parse(input);
  const response: AuthApiResponse = await signupRequest(parsed);

  const session: UserSession = {
    name: response.user.name,
    email: response.user.email,
    role: response.user.role,
    token: response.token,
  };

  authStore.setSession(session);
  return session;
}

/**
 * Orchestrates login: validate input -> call api -> update auth store state -> return session
 */
/**
 * DOCU: Validates login input, calls the API, and stores the returned session.
 * Last Updated Date: September 3, 2026
 * @param input - Login form values.
 * @returns The authenticated user session.
 * @author Keith
 */
export async function loginAction(input: LoginInput): Promise<UserSession> {
  const parsed = loginSchema.parse(input);
  const response: AuthApiResponse = await loginRequest(parsed);

  const session: UserSession = {
    name: response.user.name,
    email: response.user.email,
    role: response.user.role,
    token: response.token,
  };

  authStore.setSession(session);
  return session;
}
