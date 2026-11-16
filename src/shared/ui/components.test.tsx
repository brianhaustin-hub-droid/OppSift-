import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Modal,
  NavigationLink,
  TextInput,
  type TableColumn,
} from "./components";

type TestOpportunity = {
  id: string;
  title: string;
};

const columns: readonly TableColumn<TestOpportunity>[] = [
  {
    key: "title",
    header: "Opportunity",
    render: (row) => row.title,
  },
  {
    key: "id",
    header: "Reference",
    render: (row) => row.id,
    align: "end",
  },
];

describe("shared UI primitives", () => {
  it("uses a real button with an explicit default button type", () => {
    render(<Button onClick={vi.fn()}>Save changes</Button>);

    expect(screen.getByRole("button", { name: "Save changes" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("associates input labels, hints, and validation errors", () => {
    render(
      <TextInput
        error="Enter a valid website."
        hint="Use your public company website."
        label="Company website"
        required
      />,
    );

    const input = screen.getByRole("textbox", { name: "Company website" });
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby")?.split(" ");
    expect(describedBy).toHaveLength(2);
    expect(describedBy?.every((id) => document.getElementById(id))).toBe(true);
    expect(screen.getByText("Enter a valid website.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("exposes badge meaning as text and card semantics to assistive technology", () => {
    render(
      <Card as="section" aria-label="Funding opportunity">
        <Badge tone="warning">Deadline approaching</Badge>
      </Card>,
    );

    expect(
      screen.getByRole("region", { name: "Funding opportunity" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Deadline approaching")).toHaveClass(
      "ui-badge--warning",
    );
  });

  it("marks the current navigation item semantically", () => {
    render(
      <NavigationLink current href="/opportunities">
        Opportunities
      </NavigationLink>,
    );

    expect(
      screen.getByRole("link", { name: "Opportunities" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("renders accessible table captions, rows, and empty states", () => {
    const { rerender } = render(
      <DataTable
        caption="Company opportunities"
        columns={columns}
        emptyMessage="No opportunities have been verified."
        getRowKey={(row) => row.id}
        rows={[]}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Company opportunities table" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No opportunities have been verified."),
    ).toBeInTheDocument();

    rerender(
      <DataTable
        caption="Company opportunities"
        columns={columns}
        emptyMessage="No opportunities have been verified."
        getRowKey={(row) => row.id}
        rows={[{ id: "REF-1", title: "Verified public source" }]}
      />,
    );
    expect(screen.getByText("Verified public source")).toBeInTheDocument();
    expect(screen.getByText("REF-1")).toBeInTheDocument();
  });

  it("associates a dialog title and description and provides a native close action", () => {
    const { container } = render(
      <Modal
        description="Review the changes before saving."
        onOpenChange={vi.fn()}
        open={false}
        title="Review changes"
      >
        <p>Changes are ready for review.</p>
      </Modal>,
    );
    const dialog = container.querySelector("dialog");
    const titleId = dialog?.getAttribute("aria-labelledby");
    const descriptionId = dialog?.getAttribute("aria-describedby");
    const closeButton = container.querySelector(
      'form[method="dialog"] button',
    );

    expect(titleId).toBeTruthy();
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(titleId ?? "")).toHaveTextContent(
      "Review changes",
    );
    expect(
      document.getElementById(descriptionId ?? ""),
    ).toHaveTextContent("Review the changes before saving.");
    expect(closeButton).toHaveAttribute("type", "submit");
  });
});
