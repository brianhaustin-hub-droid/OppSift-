import { describe, expect, it } from "vitest";
import { getDeploymentConfigurationError } from "./neon-client";

describe("Neon deployment environment guard", () => {
  it("allows any build without an explicit deployment target", () => {
    expect(
      getDeploymentConfigurationError("development", undefined, undefined),
    ).toBeNull();
    expect(
      getDeploymentConfigurationError("development", undefined, "production"),
    ).toBeNull();
    expect(
      getDeploymentConfigurationError("production", undefined, undefined),
    ).toBeNull();
  });

  it("requires preview and production targets to match their branch labels", () => {
    expect(
      getDeploymentConfigurationError("production", "production", "production"),
    ).toBeNull();
    expect(
      getDeploymentConfigurationError("production", "production", "development"),
    ).toContain("must match production");
    expect(
      getDeploymentConfigurationError("production", "preview", "production"),
    ).toContain("must match preview");
  });

  it("rejects deployment targets other than preview or production", () => {
    expect(
      getDeploymentConfigurationError("production", "staging", "staging"),
    ).toContain("must be set to preview or production");
  });

  it("keeps test builds independent of deployment settings", () => {
    expect(
      getDeploymentConfigurationError("test", undefined, undefined),
    ).toBeNull();
  });
});
