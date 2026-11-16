import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";

const authMocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("./neon-client", () => ({
  neonClient: {
    auth: {
      signOut: authMocks.signOut,
      useSession: authMocks.useSession,
    },
  },
  neonConfigurationError: "",
}));

function SessionStatus() {
  const { loading, refreshSession, user } = useAuth();
  return (
    <>
      <p>
        {loading ? "Restoring session" : user ? `${user.email}:${user.emailVerified}` : "Signed out"}
      </p>
      <button onClick={() => void refreshSession()} type="button">
        Refresh session
      </button>
    </>
  );
}

describe("Neon Managed Auth session provider", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("restores the verified user returned by Neon", () => {
    authMocks.useSession.mockReturnValue({
      data: {
        user: {
          id: "verified-user",
          name: "Test User",
          email: "verified@example.test",
          emailVerified: true,
        },
      },
      error: null,
      isPending: false,
    });

    render(
      <AuthProvider>
        <SessionStatus />
      </AuthProvider>,
    );

    expect(screen.getByText("verified@example.test:true")).toBeInTheDocument();
  });

  it("keeps protected routes in a loading state during session restoration", () => {
    authMocks.useSession.mockReturnValue({
      data: null,
      error: null,
      isPending: true,
    });

    render(
      <AuthProvider>
        <SessionStatus />
      </AuthProvider>,
    );

    expect(screen.getByText("Restoring session")).toBeInTheDocument();
  });

  it("reads the session again when a provider-side change needs confirmation", async () => {
    const refetch = vi.fn(async () => {});
    authMocks.useSession.mockReturnValue({
      data: {
        user: {
          id: "verified-user",
          name: "Test User",
          email: "verified@example.test",
          emailVerified: true,
        },
      },
      error: null,
      isPending: false,
      refetch,
    });

    render(
      <AuthProvider>
        <SessionStatus />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh session" }));

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it("keeps a refresh request harmless when the read exposes no refetch", () => {
    authMocks.useSession.mockReturnValue({
      data: {
        user: {
          id: "verified-user",
          name: "Test User",
          email: "verified@example.test",
          emailVerified: true,
        },
      },
      error: null,
      isPending: false,
    });

    render(
      <AuthProvider>
        <SessionStatus />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh session" }));

    expect(screen.getByText("verified@example.test:true")).toBeInTheDocument();
  });
});
