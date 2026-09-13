"use client";

/**
 * DOCU: React Context Provider bridging user authentication and role state across App Router.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import React, { createContext, useContext, ReactNode } from "react";
import { useAuthSession } from "@/hooks/auth.hook";
import { UserProfile } from "@/entities/interfaces/auth.interface";
import { RoleType } from "@/entities/enums/auth.enum";

export interface AuthContextValue {
  /** Whether the user currently has an authenticated session. */
  isAuthenticated: boolean;
  /** Current authorization role of the authenticated user. */
  role: RoleType | null;
  /** Authenticated user profile information. */
  user: UserProfile | null;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  role: null,
  user: null,
});

/**
 * DOCU: Context provider component exposing authentication state and user details to the component tree.
 * Last Updated Date: September 7, 2026
 * @param children - Child components wrapped within this auth context.
 * @author Keith
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, role, user } = useAuthSession();

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, user }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * DOCU: Hook accessing the ambient AuthContext authentication and role state.
 * Last Updated Date: September 7, 2026
 * @returns AuthContextValue containing isAuthenticated, role, and user.
 * @author Keith
 */
export function useAuthContext() {
  return useContext(AuthContext);
}
