import { describe, expect, it } from "vitest";
import { getDeploymentConfigurationError } from "./neon-client";

describe("Neon deployment environment guard", () => {
  it("allows development only on the development branch", () => {
    expect(
      getDeploymentConfigurationError("development", "development", "development"),
    ).toBeNull();
    expect(
      getDeploymentConfigurationError("development", undefined, "production"),
    ).toContain("Development builds must target");
  });

  it("requires preview and production builds to match their branch labels", () => {
    expect(
      getDeploymentConfigurationError("production", "production", "production"),
    ).toBeNull();
    expect(
      getDeploymentConfigurationError("production", "production", "development"),
    ).toContain("matching Neon branch");
    expect(
      getDeploymentConfigurationError("production", undefined, undefined),
    ).toContain("explicitly set VITE_NEON_DEPLOYMENT_ENV");
  });

  it("keeps test builds independent of deployment settings", () => {
    expect(
      getDeploymentConfigurationError("test", undefined, undefined),
    ).toBeNull();
  });
});
