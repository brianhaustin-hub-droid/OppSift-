import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../app/App";

describe("global discovery experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/discover");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/dashboard");
    vi.unstubAllEnvs();
  });

  it("submits a search without fabricating opportunity results", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByRole("searchbox", {
        name: "Search keywords, titles, organisations or reference numbers",
      }),
      "renewable",
    );
    await user.click(screen.getByRole("button", { name: "Search opportunities" }));

    expect(window.location.pathname).toBe("/discover/search");
    expect(window.location.search).toContain("q=renewable");
    expect(
      await screen.findByRole("heading", { name: "No live opportunities to display" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Quick view" })).not.toBeInTheDocument();
  });

  it("persists a named search in this browser and can run it again", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/discover/search?q=renewable");
    render(<App />);

    await user.type(screen.getByLabelText("Save this search"), "Clean energy");
    await user.click(screen.getByRole("button", { name: "Save search" }));
    await user.click(screen.getByRole("link", { name: "Saved searches" }));

    const savedCard = screen.getByRole("article");
    expect(within(savedCard).getByRole("heading", { name: "Clean energy" })).toBeInTheDocument();
    await user.click(within(savedCard).getByRole("button", { name: "Run search" }));
    expect(window.location.pathname).toBe("/discover/search");
    expect(window.location.search).toContain("q=renewable");
  });

  it("shows honest coverage state for an approved country without records", async () => {
    window.history.replaceState(null, "", "/discover/country/SS");
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Opportunities in South Sudan" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/source permissions, live feeds and category coverage are not verified/i)).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "No live opportunities to display" }),
    ).toBeInTheDocument();
  });

  it("explains the source-backed listing state without showing fabricated data", async () => {
    vi.stubEnv("PROD", true);
    window.history.replaceState(null, "", "/discover/country/SS");
    render(<App />);

    expect(
      await screen.findByText(/No verified opportunities match these filters/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/DEMO|demonstration/i)).not.toBeInTheDocument();
  });

  it("does not render pagination when there are no live records", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "No live opportunities to display" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Search result pages" })).not.toBeInTheDocument();
  });

  it("uses the mobile filter drawer to update and share a country filter", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/discover");
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Show filters" }));
    await user.selectOptions(
      screen.getByRole("listbox", { name: "Country" }),
      "KE",
    );
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(window.location.search).toContain("country=KE");
    expect(screen.getByRole("button", { name: "country: KE" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No live opportunities to display" })).toBeInTheDocument();
  });

  it("shows a country-specific publisher link without claiming ingestion", () => {
    window.history.replaceState(null, "", "/discover/country/GB");
    render(<App />);

    expect(screen.getByRole("link", { name: /Contracts Finder/ })).toHaveAttribute(
      "href",
      "https://www.contractsfinder.service.gov.uk/",
    );
    expect(screen.getByText(/not live OppSift feeds/i)).toBeInTheDocument();
  });

  it("opens keyboard search suggestions and submits the focused phrase", async () => {
    const user = userEvent.setup();
    render(<App />);

    const globalSearch = screen.getByRole("searchbox", {
      name: "Search opportunities",
    });
    await user.click(globalSearch);
    await user.keyboard("{ArrowDown}");
    const suggestions = within(
      screen.getByRole("region", { name: "Search suggestions" }),
    );
    expect(
      suggestions.getByRole("button", { name: "Renewable energy" }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(window.location.pathname).toBe("/discover/search");
    expect(window.location.search).toContain("q=Renewable");
  });
});
