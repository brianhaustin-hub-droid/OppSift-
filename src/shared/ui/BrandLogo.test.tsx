import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BrandLogo } from "./BrandLogo";

describe("OppSift brand logo", () => {
  afterEach(cleanup);

  it("uses the supplied wordmark and app mark assets", () => {
    const { rerender } = render(<BrandLogo size="md" />);
    expect(
      screen.getByRole("img", {
        name: "OppSift — Global Opportunity Intelligence",
      }),
    ).toHaveAttribute("src", "/assets/oppsift-wordmark-transparent.png");

    rerender(<BrandLogo markOnly size="sm" />);
    expect(screen.getByRole("img", { name: "OppSift" })).toHaveAttribute(
      "src",
      "/assets/oppsift-app-mark-transparent.png",
    );
  });
});
