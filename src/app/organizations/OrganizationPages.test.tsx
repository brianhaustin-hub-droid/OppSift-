import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizationsPage } from "./OrganizationPages";

const organizationMocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  setActiveOrganization: vi.fn(),
  reload: vi.fn(),
  organization: {
    id: "organization-1",
    name: "Example organization",
    slug: "example-organization",
    organization_type: "company",
    country_code: "US",
    website: null,
    description: null,
  },
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "viewer-1",
      email: "viewer@example.test",
      emailVerified: true,
    },
  }),
}));

vi.mock("../auth/neon-client", () => ({
  neonClient: { rpc: organizationMocks.rpc },
}));

vi.mock("./OrganizationProvider", () => ({
  useOrganizations: () => ({
    activeOrganization: organizationMocks.organization,
    activeRole: "viewer",
    error: "",
    loading: false,
    organizations: [],
    reload: organizationMocks.reload,
    setActiveOrganization: organizationMocks.setActiveOrganization,
  }),
}));

describe("organization access UI", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("does not request the manager-only member directory for a viewer", () => {
    render(<OrganizationsPage />);

    expect(screen.getByText("Only organization owners and administrators can view the member directory.")).toBeVisible();
    expect(organizationMocks.rpc).not.toHaveBeenCalled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
