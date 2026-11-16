import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App";
import { neonClient } from "../auth/neon-client";

describe("backend diagnostics", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/dashboard");
  });

  it("reports missing development configuration without exposing values", () => {
    window.history.replaceState(null, "", "/backend-status");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Backend status" })).toBeVisible();
    if (!import.meta.env.DEV) {
      expect(screen.getByRole("heading", { name: "Diagnostics unavailable" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Test Data API" })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Check anonymous denial" }),
      ).not.toBeInTheDocument();
      return;
    }
    expect(screen.getByRole("button", { name: "Test Data API" }).hasAttribute("disabled")).toBe(!neonClient);
    expect(screen.getByRole("heading", { name: "Backend environment" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Authorization boundary" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Check anonymous denial" }),
    ).toBeVisible();
    expect(screen.getByText(/signed-out read of/)).toBeVisible();
    expect(screen.getByText(/Object Storage: private bucket provisioned/)).toBeVisible();
    expect(screen.getByText(/0001: applied · 0002: applied/)).toBeVisible();
    expect(screen.getByText(/The local migration ledger is bookkeeping only/)).toBeVisible();
    expect(document.body).not.toHaveTextContent("VITE_NEON_AUTH_URL");
    expect(document.body).not.toHaveTextContent("VITE_NEON_DATA_API_URL");
  });
});
