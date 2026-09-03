import { client } from "./client";
import type { SignupInput, LoginInput } from "@/lib/validation/auth";
import type { AuthEnvelope, AuthApiResponse } from "@/types/auth.types";

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
