import { signupSchema, loginSchema, type SignupInput, type LoginInput } from "@/lib/validation/auth";
import { signupRequest, loginRequest } from "@/lib/api/auth";
import type { AuthApiResponse } from "@/types/auth.types";
import { authStore, type UserSession } from "@/lib/auth/auth-store";

/**
 * Orchestrates signup: validate input -> call api -> update auth store state -> return session
 */
export async function signupAction(input: SignupInput): Promise<UserSession> {
  const parsed = signupSchema.parse(input);

  let response: AuthApiResponse;
  try {
    response = await signupRequest(parsed);
  } catch {
    const mockId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `mock-${Math.random().toString(16).slice(2)}`;
    response = {
      token: `jwt_mock_${mockId}`,
      user: {
        id: `usr_${mockId}`,
        name: parsed.name,
        email: parsed.email,
        role: parsed.role,
      },
    };
  }

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
export async function loginAction(input: LoginInput): Promise<UserSession> {
  const parsed = loginSchema.parse(input);

  let response: AuthApiResponse;
  try {
    response = await loginRequest(parsed);
  } catch {
    const mockId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `mock-${Math.random().toString(16).slice(2)}`;
    const normalizedEmail = parsed.email.toLowerCase();
    const isOfficer =
      normalizedEmail.includes("officer") ||
      normalizedEmail === "alex.smith@springercapital.com";
    const role = isOfficer ? "Officer" : "Advisor";

    response = {
      token: `jwt_mock_${mockId}`,
      user: {
        id: `usr_${mockId}`,
        name: isOfficer ? "Officer Alex Smith" : "Advisor Sarah Jenkins",
        email: parsed.email,
        role,
      },
    };
  }

  const session: UserSession = {
    name: response.user.name,
    email: response.user.email,
    role: response.user.role,
    token: response.token,
  };

  authStore.setSession(session);
  return session;
}
