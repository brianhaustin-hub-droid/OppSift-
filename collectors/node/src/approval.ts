import type { CollectorRequest } from "./contract.js";

export type ApprovedSource = {
  sourceId: string;
  connectorId: string;
  approvalStatus: "approved" | "approved_with_constraints";
  reusePermission: "permitted" | "conditional";
  active: boolean;
  allowedHosts: readonly string[];
  methods: readonly ("GET" | "HEAD")[];
  conditionalConstraintsEnforced: boolean;
  minimumRequestIntervalMs: number;
  maxRequests: number;
};

export type ApprovalAuthority = {
  loadApprovedSource(sourceId: string, connectorId: string): Promise<ApprovedSource | null>;
  enforceConditionalConstraints?(
    source: ApprovedSource,
    request: CollectorRequest,
  ): Promise<boolean>;
};

export async function assertCollectionApproved(
  request: CollectorRequest,
  authority: ApprovalAuthority,
): Promise<ApprovedSource> {
  const source = await authority.loadApprovedSource(request.sourceId, request.connectorId);
  if (
    !source ||
    source.sourceId !== request.sourceId ||
    source.connectorId !== request.connectorId ||
    !source.active ||
    !["approved", "approved_with_constraints"].includes(source.approvalStatus) ||
    !["permitted", "conditional"].includes(source.reusePermission) ||
    request.constraints.approvalStatus !== source.approvalStatus ||
    request.constraints.reusePermission !== source.reusePermission
  ) {
    throw new Error("Source registry did not authorize this collection request.");
  }

  const approvedHosts = new Set(source.allowedHosts.map(normalizeHostname));
  const requestHosts = request.allowedHosts.map(normalizeHostname);
  if (
    requestHosts.length === 0 ||
    requestHosts.some((host) => !approvedHosts.has(host)) ||
    !requestHosts.includes(new URL(request.sourceBaseUrl).hostname.toLowerCase())
  ) {
    throw new Error("Collector host allowlist exceeds the approved source registry.");
  }
  if (
    request.constraints.allowedMethods.length === 0 ||
    request.constraints.allowedMethods.some((method) => !source.methods.includes(method)) ||
    request.limits.maxRequests > source.maxRequests ||
    request.limits.minimumRequestIntervalMs < source.minimumRequestIntervalMs
  ) {
    throw new Error("Collector request limits exceed the approved source constraints.");
  }

  if (source.approvalStatus === "approved_with_constraints") {
    if (
      !source.conditionalConstraintsEnforced ||
      !request.constraints.conditionalConstraintsEnforced ||
      !authority.enforceConditionalConstraints ||
      !(await authority.enforceConditionalConstraints(source, request))
    ) {
      throw new Error("Conditional source terms are not verifiably enforceable.");
    }
  }
  return source;
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/\.$/u, "");
}
