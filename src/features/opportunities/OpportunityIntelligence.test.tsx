import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";

describe("opportunity intelligence without live records", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/opportunity/unavailable-record");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/dashboard");
  });

  it("does not open an opportunity profile for an unknown record", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Opportunity not found" }),
    ).toBeVisible();
    expect(screen.queryByText(/DEMO|demonstration/i)).not.toBeInTheDocument();
  });

  it("returns to discovery from an unavailable opportunity profile", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: "Opportunity not found" });
    await user.click(screen.getByRole("link", { name: "Back to discovery" }));

    expect(window.location.pathname).toBe("/discover");
    expect(
      await screen.findByRole("heading", { name: "Discover Global Opportunities" }),
    ).toBeVisible();
  });
});
