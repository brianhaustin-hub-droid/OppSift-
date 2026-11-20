import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { neonClient } from "./neon-client";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt?: Date | string;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  authError: string;
  user: AuthenticatedUser | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function ConnectedAuthProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: NonNullable<typeof neonClient>;
}) {
  const sessionQuery = client.auth.useSession();
  const user = sessionQuery.data?.user ?? null;

  async function signOut() {
    const result = await client.auth.signOut();
    if (result.error) {
      throw new Error(result.error.message || "Unable to sign out.");
    }
  }

  // Provider-side verification can leave the cached session read stale, so a
  // successful email verification asks the session query to read again.
  async function refreshSession() {
    const refetch: unknown = Reflect.get(sessionQuery, "refetch");
    if (typeof refetch === "function") {
      await (refetch as () => Promise<unknown>)();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        configured: true,
        loading: sessionQuery.isPending,
        authError: sessionQuery.error
          ? "Authentication session request failed. Check Neon Auth configuration and trusted origins."
          : "",
        user,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (neonClient) {
    return <ConnectedAuthProvider client={neonClient}>{children}</ConnectedAuthProvider>;
  }

  return (
    <AuthContext.Provider
      value={{
        configured: false,
        loading: false,
        authError: "",
        user: null,
        refreshSession: async () => {},
        signOut: async () => {
          throw new Error("Neon Managed Auth is not configured.");
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuth() {
  const context = useOptionalAuth();
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
