import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { routes } from "./routing/routes";

const authState = vi.hoisted(() => ({
  value: {
    configured: true,
    loading: false,
    authError: "",
    user: null as null | {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
    },
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => authState.value,
}));

const verifiedUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.test",
  emailVerified: true,
};

describe("OppSift integration foundation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/dashboard");
    authState.value = {
      configured: true,
      loading: false,
      authError: "",
      user: null,
      signOut: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/dashboard");
    authState.value = {
      configured: true,
      loading: false,
      authError: "",
      user: null,
      signOut: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("registers every preserved workspace route identity", () => {
    const ids = routes.map((route) => route.id);
    for (const id of [
      "dashboard",
      "discover",
      "government",
      "grants",
      "commercial",
      "saved-searches",
      "search-history",
      "my-opportunities",
      "backend-status",
      "intelligence",
      "saved",
      "applications",
      "teams",
      "alerts",
      "analytics",
      "settings",
      "admin",
      "admin-sources",
      "admin-coverage",
      "admin-ingestion",
      "admin-quality",
      "support",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("requires a verified account before protected routes render", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Sign in to continue" })).toBeInTheDocument();
  });

  it("requires email verification for authenticated but unverified accounts", () => {
    authState.value = {
      ...authState.value,
      user: { ...verifiedUser, emailVerified: false },
    };
    render(<App />);
    expect(screen.getByRole("heading", { name: "Verify your email to continue" })).toBeInTheDocument();
  });

  it("renders the placeholder boundary for a verified account", () => {
    authState.value = { ...authState.value, user: verifiedUser };
    render(<App />);
    expect(screen.getByRole("heading", { name: "Temporary screen placeholder" })).toBeInTheDocument();
    expect(screen.getByText(/Route: \/dashboard/)).toBeInTheDocument();
  });

  it("renders a placeholder for public routes", () => {
    window.history.replaceState(null, "", "/");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Temporary screen placeholder" })).toBeInTheDocument();
    expect(screen.getByText(/Route: \//)).toBeInTheDocument();
  });

  it("renders the authentication placeholder for auth routes", () => {
    window.history.replaceState(null, "", "/login");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Authentication screen placeholder" })).toBeInTheDocument();
  });
});
