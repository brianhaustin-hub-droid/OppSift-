import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { RouterProvider } from "../../app/routing/router";
import { MarketsPage } from "./MarketsPage";

describe("market scope filters", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
  });

  it("filters by region, includes Australia in Asia-Pacific, and resets", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/markets");
    render(
      <RouterProvider>
        <MarketsPage />
      </RouterProvider>,
    );

    expect(screen.getByText("48 intended markets")).toBeVisible();
    expect(screen.getByText("Countries with named source leads")).toBeVisible();
    expect(screen.getByText("Candidate source products")).toBeVisible();
    expect(screen.getByText("Retrieved samples (known count)")).toBeVisible();
    expect(screen.getByText("Records parsed by OppSift")).toBeVisible();
    expect(screen.getByText("Operational connectors")).toBeVisible();
    expect(screen.getByText("67", { exact: true })).toBeVisible();
    expect(
      screen.queryByText("No named source candidates"),
    ).not.toBeInTheDocument();
    const unitedStates = screen.getByText("United States").closest("li");
    expect(unitedStates).not.toBeNull();
    await user.click(within(unitedStates as HTMLElement).getByText("Show source candidates"));
    const samLink = within(unitedStates as HTMLElement).getByRole("link", {
      name: "SAM.gov Contract Opportunities",
    });
    expect(samLink).toBeVisible();
    const samCandidate = samLink.closest("li");
    expect(samCandidate).not.toBeNull();
    expect(samCandidate).toHaveTextContent("No live retrieval verified");
    expect(samCandidate).toHaveTextContent("Source-specific connector exists");
    expect(samCandidate).toHaveTextContent("0 parsed by OppSift");
    expect(samCandidate).toHaveTextContent("0 stored");
    await user.click(screen.getByRole("button", { name: /^Europe$/u }));
    expect(window.location.search).toBe("?region=europe");
    expect(screen.getByText("11 intended markets")).toBeVisible();
    expect(screen.getByText("Germany")).toBeVisible();
    expect(screen.getByText("United Kingdom")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /^North America$/u }),
    );
    expect(screen.getByText("2 intended markets")).toBeVisible();
    expect(screen.getByText("United States")).toBeVisible();
    expect(screen.getByText("Canada")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^East Africa$/u }));
    expect(screen.getByText("7 intended markets")).toBeVisible();
    for (const country of [
      "Kenya",
      "Uganda",
      "Tanzania",
      "Rwanda",
      "Burundi",
      "Ethiopia",
      "South Sudan",
    ]) {
      expect(screen.getByText(country)).toBeVisible();
    }

    await user.click(
      screen.getByRole("button", { name: /^Asia-Pacific$/u }),
    );
    expect(window.location.search).toBe("?region=asia");
    expect(screen.getByText("10 intended markets")).toBeVisible();
    expect(screen.getByText("Australia")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /^West Africa$/u }),
    );
    expect(window.location.search).toBe("?region=west_africa");
    expect(screen.getByText("10 intended markets")).toBeVisible();
    for (const country of [
      "Nigeria",
      "Ghana",
      "Liberia",
      "Sierra Leone",
      "Côte d'Ivoire",
      "Benin",
      "Senegal",
      "Gambia",
      "Niger",
      "Burkina Faso",
    ]) {
      expect(screen.getByText(country)).toBeVisible();
    }

    await user.click(
      screen.getByRole("button", { name: /^Southern Africa$/u }),
    );
    expect(window.location.search).toBe("?region=southern_africa");
    expect(screen.getByText("8 intended markets")).toBeVisible();
    for (const country of [
      "Mauritius",
      "Zambia",
      "South Africa",
      "Botswana",
      "Namibia",
      "Madagascar",
      "Malawi",
      "Mozambique",
    ]) {
      expect(screen.getByText(country)).toBeVisible();
    }

    await user.click(
      screen.getByRole("button", { name: /^All regions$/u }),
    );
    expect(window.location.pathname).toBe("/markets");
    expect(window.location.search).toBe("");
    expect(screen.getByText("48 intended markets")).toBeVisible();
  });
});
