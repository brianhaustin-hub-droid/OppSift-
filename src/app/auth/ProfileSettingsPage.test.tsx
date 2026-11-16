import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouterProvider } from "../routing/router";
import { ProfileSettingsPage } from "./ProfileSettingsPage";

const profileMocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("./AuthProvider", () => ({
  useAuth: () => ({
    signOut: profileMocks.signOut,
    user: {
      id: "user-1",
      name: "Test User",
      email: "person@example.test",
      emailVerified: true,
      image: null,
      createdAt: "2026-01-02T00:00:00.000Z",
    },
  }),
}));

vi.mock("./neon-client", () => ({
  neonClient: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: profileMocks.maybeSingle,
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe("profile settings", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
  });

  it("shows Auth-owned verification details and signs out through the provider", async () => {
    const user = userEvent.setup();
    profileMocks.maybeSingle.mockResolvedValue({
      data: {
        display_name: "Test User",
        locale: "en",
        time_zone: null,
      },
      error: null,
    });
    profileMocks.signOut.mockResolvedValue(undefined);
    render(
      <RouterProvider>
        <ProfileSettingsPage />
      </RouterProvider>,
    );

    expect(await screen.findByText("Verified")).toBeVisible();
    expect(screen.getByText("person@example.test")).toBeVisible();
    expect(screen.getByText("Account created").parentElement).toHaveTextContent(/\d{4}/);
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(profileMocks.signOut).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe("/login");
  });
});
