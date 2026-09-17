/**
 * DOCU: Authentication Service consuming APIClient for user login, registration, validation, and logout.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { apiClient, APIClient } from "@/utils/apiClient";
import { authStore } from "@/lib/auth/auth-store";
import { UserProfile, UserSession } from "@/entities/interfaces/auth.interface";
import { ApiResponseEnvelope } from "@/entities/types/api.type";
import { LoginInput, SignupInput } from "@/schema/auth.schema";

export class AuthService {
  private client: APIClient;

  constructor() {
    this.client = apiClient;
  }

  /**
   * DOCU: Authenticates a user with email and password credentials, storing the session in authStore.
   * Last Updated Date: September 7, 2026
   * @param credentials - User email and password payload.
   * @returns Active UserSession containing user details, role, and Bearer token.
   * @author Keith
   */
  public async login(credentials: LoginInput): Promise<UserSession> {
    const envelope = await this.client.post<ApiResponseEnvelope<{ token: string; user: UserProfile }>>(
      "/auth/login",
      credentials,
      { skipAuth: true }
    );

    const session: UserSession = {
      name: envelope.data.user.name,
      email: envelope.data.user.email,
      role: envelope.data.user.role,
      token: envelope.data.token,
    };

    authStore.setSession(session);
    return session;
  }

  /**
   * DOCU: Registers a new advisor or compliance officer and establishes their authenticated session.
   * Last Updated Date: September 7, 2026
   * @param payload - User registration details including name, email, password, and role.
   * @returns Newly created UserSession with token and user profile data.
   * @author Keith
   */
  public async signup(payload: SignupInput): Promise<UserSession> {
    const envelope = await this.client.post<ApiResponseEnvelope<{ token: string; user: UserProfile }>>(
      "/auth/signup",
      payload,
      { skipAuth: true }
    );

    const session: UserSession = {
      name: envelope.data.user.name,
      email: envelope.data.user.email,
      role: envelope.data.user.role,
      token: envelope.data.token,
    };

    authStore.setSession(session);
    return session;
  }

  /**
   * DOCU: Validates the active Bearer token and retrieves the current authenticated user's profile.
   * Last Updated Date: September 7, 2026
   * @returns Current UserProfile fetched from the backend /auth/me endpoint.
   * @author Keith
   */
  public async getMe(): Promise<UserProfile> {
    const envelope = await this.client.get<ApiResponseEnvelope<UserProfile>>("/auth/me");
    return envelope.data;
  }

  /**
   * DOCU: Logs out the current user by clearing the authenticated session from authStore.
   * Last Updated Date: September 7, 2026
   * @author Keith
   */
  public logout(): void {
    authStore.clearSession();
  }
}

export const authService = new AuthService();
