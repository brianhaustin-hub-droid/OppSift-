import { act, cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { routes } from "./routing/routes";

const authState = vi.hoisted(() => ({
  value: {
    configured: false,
    loading: false,
    authError: "",
    user: null as null | {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
    },
    signOut: vi.fn(),
  },
}));

vi.mock("./auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => authState.value,
}));

describe("OppSift platform shell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/dashboard");
    authState.value = {
      configured: false,
      loading: false,
      authError: "",
      user: null,
      signOut: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/dashboard");
    authState.value = {
      configured: false,
      loading: false,
      authError: "",
      user: null,
      signOut: vi.fn(),
    };
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    delete document.documentElement.dataset.theme;
  });

  it("requires a verified account to access the overview dashboard", () => {
    render(<App />);

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(
      screen.getByRole("heading", { name: "Sign in to continue" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("main", { name: "Main content" })).getByRole(
        "link",
        { name: "Sign in" },
      ),
    ).toHaveAttribute(
      "href",
      "/login?redirectTo=%2Fdashboard",
    );
    expect(document.title).toBe("Overview · OppSift");
  });

  it("allows a signed-in verified account to access the overview dashboard", () => {
    authState.value = {
      ...authState.value,
      user: {
        id: "verified-user",
        name: "Test User",
        email: "verified@example.test",
        emailVerified: true,
      },
    };
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Find the right opportunity",
    );
    expect(screen.getByText("Live source coverage: 0")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No live listings are available" })).toBeInTheDocument();
  });

  it("requires email verification before dashboard access", () => {
    authState.value = {
      ...authState.value,
      user: {
        id: "unverified-user",
        name: "Test User",
        email: "pending@example.test",
        emailVerified: false,
      },
    };
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Verify your email to continue" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verify email" })).toHaveAttribute(
      "href",
      "/verify-email?email=pending%40example.test",
    );
  });

  it("keeps authentication pages separate from the platform shell", () => {
    window.history.replaceState(null, "", "/login");
    render(<App />);

    expect(document.querySelector(".auth-app-shell")).toBeInTheDocument();
    expect(document.querySelector(".platform-shell")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Platform" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("searchbox", { name: "Search opportunities" }),
    ).not.toBeInTheDocument();
  });

  it("expands the compact sidebar while a pointer hovers over it", async () => {
    const user = userEvent.setup();
    render(<App />);
    const sidebar = screen.getByRole("complementary", {
      name: "OppSift platform navigation",
    });

    expect(screen.getByRole("img", { name: "OppSift" })).toHaveAttribute(
      "src",
      "/assets/oppsift-app-mark-transparent.png",
    );

    await user.hover(sidebar);
    expect(
      screen.getByRole("img", {
        name: "OppSift — Global Opportunity Intelligence",
      }),
    ).toHaveAttribute("src", "/assets/oppsift-wordmark-transparent.png");

    await user.unhover(sidebar);
    expect(screen.getByRole("img", { name: "OppSift" })).toHaveAttribute(
      "src",
      "/assets/oppsift-app-mark-transparent.png",
    );
  });

  it("navigates to discovery without showing fabricated listings", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("link", { name: "Discover opportunities" }),
    );
    expect(window.location.pathname).toBe("/discover");
    expect(
      screen.getByRole("heading", { name: "Discover Global Opportunities" }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: "Search opportunities" }),
      "renewable",
    );
    await user.click(screen.getByRole("button", { name: "Submit search" }));

    expect(window.location.search).toBe("?q=renewable");
    expect(
      await screen.findByRole("heading", { name: "No live opportunities to display" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/DEMO|demonstration/i)).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "Platform" })).getByRole(
        "link",
        { name: "Overview" },
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Sign in to continue" }),
    ).toBeInTheDocument();
  });

  it("renders a destination for every configured route", () => {
    render(<App />);

    for (const route of routes) {
      act(() => {
        window.history.replaceState(null, "", route.href);
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      expect(
        screen.getByRole("link", { name: new RegExp(route.label) }),
      ).toHaveAttribute("aria-current", "page");
      if (route.id === "dashboard") {
        expect(
          screen.getByRole("heading", { name: "Sign in to continue" }),
        ).toBeInTheDocument();
      } else if (route.permission === "admin:access") {
        expect(
          screen.getByRole("heading", {
            name: "Administrator permission required",
          }),
        ).toBeInTheDocument();
      } else if (
        ["saved", "applications", "teams", "alerts", "analytics", "settings"].includes(
          route.id,
        )
      ) {
        expect(
          screen.getByRole("heading", { name: "Sign in to continue" }),
        ).toBeInTheDocument();
      } else {
        const title =
          route.id === "discover" ? "Discover Global Opportunities" : route.title;
        expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      }
    }
  });

  it("does not resolve a fabricated opportunity identifier", async () => {
    window.history.replaceState(null, "", "/opportunity/demo-01");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Opportunity not found" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/DEMO|demonstration/i)).not.toBeInTheDocument();
  });

  it("supports keyboard dismissal of the mobile navigation", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("link", { name: "Overview" }),
    ).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toHaveFocus();
  });

  it("uses the mobile market filter with the configured market registry", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
    });
    authState.value = {
      ...authState.value,
      user: {
        id: "verified-user",
        name: "Test User",
        email: "verified@example.test",
        emailVerified: true,
      },
    };
    window.history.replaceState(null, "", "/discover");
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Open opportunity filters" }),
    );
    const panel = screen.getByRole("dialog", { name: "Opportunity filters" });
    await user.selectOptions(
      within(panel).getByRole("combobox", { name: "Market" }),
      "GB",
    );

    expect(
      within(panel).getByRole("combobox", { name: "Market" }),
    ).toHaveValue("GB");
    expect(
      await screen.findByRole("heading", { name: "No live opportunities to display" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Contracts Finder/ })).toHaveAttribute(
      "href",
      "https://www.contractsfinder.service.gov.uk/",
    );
  });

  it("toggles and persists the theme preference", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem("oppsift-theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem("oppsift-theme")).toBe("light");
  });

  it("restores a saved dark theme", () => {
    window.localStorage.setItem("oppsift-theme", "dark");
    render(<App />);

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("denies the administration page to the preview role", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: /Administration/ }));

    expect(window.location.pathname).toBe("/admin");
    expect(
      screen.getByRole("heading", {
        name: "Administrator permission required",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no administrative data has been loaded/i)).toBeInTheDocument();
  });

  it("shows a real configuration state for sign-in when Neon URLs are missing", () => {
    window.history.replaceState(null, "", "/login");
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Authentication isn’t configured" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Neon Managed Auth URL is not configured/)).toBeInTheDocument();
  });

  it("requires authentication for organization and account routes", () => {
    window.history.replaceState(null, "", "/teams");
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Sign in to continue" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("main", { name: "Main content" })).getByRole(
        "link",
        { name: "Sign in" },
      ),
    ).toHaveAttribute(
      "href",
      "/login?redirectTo=%2Fteams",
    );
  });
});
