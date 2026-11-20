import { neonClient } from "../../app/auth/neon-client";

// Organisation/team database functionality preserved from the removed screens.
// The Stitch screens should call these functions instead of embedding queries.

export type OrganizationMember = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  status: string;
};

export type OrganizationInvitation = {
  id: string;
  invited_email: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: string;
  expires_at: string | null;
};

function requestError(error: unknown) {
  return error instanceof Error ? error.message : "The organization request failed.";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeMembers(value: unknown): OrganizationMember[] {
  if (!Array.isArray(value)) throw new Error("The organization member response is invalid.");
  return value.map((row): OrganizationMember => {
    if (typeof row !== "object" || row === null) throw new Error("The organization member response contains an invalid entry.");
    const record = row as Record<string, unknown>;
    const role = asString(record.role);
    if (!["owner", "admin", "member", "viewer"].includes(role)) {
      throw new Error("The organization member response contains an invalid role.");
    }
    return {
      user_id: asString(record.user_id),
      email: asString(record.email),
      display_name: typeof record.display_name === "string" ? record.display_name : null,
      role: role as OrganizationMember["role"],
      status: asString(record.status),
    };
  });
}

function normalizeInvitations(value: unknown): OrganizationInvitation[] {
  if (!Array.isArray(value)) throw new Error("The invitation list response is invalid.");
  return value.map((row): OrganizationInvitation => {
    if (typeof row !== "object" || row === null) throw new Error("The invitation list contains an invalid entry.");
    const record = row as Record<string, unknown>;
    const role = asString(record.role);
    return {
      id: asString(record.id),
      invited_email: asString(record.invited_email),
      role: ["owner", "admin", "member", "viewer"].includes(role) ? (role as OrganizationInvitation["role"]) : "member",
      status: asString(record.status),
      expires_at: typeof record.expires_at === "string" ? record.expires_at : null,
    };
  });
}

export async function listOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient.rpc("list_organization_members", { p_organization_id: organizationId });
  if (result.error) throw new Error(requestError(result.error));
  return normalizeMembers(result.data);
}

export async function listPendingInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient
    .from("organization_invitations")
    .select("id, invited_email, role, status, expires_at")
    .eq("organization_id", organizationId)
    .eq("status", "pending");
  if (result.error) throw new Error(requestError(result.error));
  return normalizeInvitations(result.data);
}

export async function issueOrganizationInvitation(
  organizationId: string,
  email: string,
  role: "admin" | "member" | "viewer",
): Promise<string> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient.rpc("issue_organization_invitation", {
    p_organization_id: organizationId,
    p_email: email.trim(),
    p_role: role,
  });
  if (result.error) throw new Error(requestError(result.error));
  const rows = Array.isArray(result.data) ? result.data : [];
  const token = typeof rows[0] === "object" && rows[0] !== null && "invitation_token" in rows[0]
    ? asString((rows[0] as Record<string, unknown>).invitation_token)
    : "";
  if (!token) throw new Error("The invitation was created without a usable link token.");
  return token;
}

export async function changeOrganizationMemberRole(
  organizationId: string,
  userId: string,
  role: "admin" | "member" | "viewer",
): Promise<void> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient.rpc("change_organization_member_role", {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_role: role,
  });
  if (result.error) throw new Error(requestError(result.error));
  if (result.data !== true) throw new Error("The role change was not authorized or the member is no longer active.");
}

export async function removeOrganizationMember(organizationId: string, userId: string): Promise<void> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient.rpc("remove_organization_member", {
    p_organization_id: organizationId,
    p_user_id: userId,
  });
  if (result.error) throw new Error(requestError(result.error));
  if (result.data !== true) throw new Error("The member could not be removed. Owner and administrator restrictions may apply.");
}

export async function revokeOrganizationInvitation(invitationId: string): Promise<void> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient.rpc("revoke_organization_invitation", { p_invitation_id: invitationId });
  if (result.error) throw new Error(requestError(result.error));
  if (result.data !== true) throw new Error("The invitation could not be revoked.");
}

export async function transferOrganizationOwnership(organizationId: string, newOwnerUserId: string): Promise<void> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient.rpc("transfer_organization_ownership", {
    p_organization_id: organizationId,
    p_new_owner_user_id: newOwnerUserId,
  });
  if (result.error) throw new Error(requestError(result.error));
  if (result.data !== true) throw new Error("Ownership could not be transferred.");
}

export async function acceptOrganizationInvitation(token: string): Promise<void> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient.rpc("accept_organization_invitation", { p_token: token });
  if (result.error) throw new Error(requestError(result.error));
  if (result.data !== true) {
    throw new Error("This invitation is invalid, expired, already used, or belongs to a different verified email address.");
  }
}

export async function declineOrganizationInvitation(token: string): Promise<void> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient.rpc("decline_organization_invitation", { p_token: token });
  if (result.error) throw new Error(requestError(result.error));
  if (result.data !== true) {
    throw new Error("This invitation is invalid, expired, already used, or belongs to a different verified email address.");
  }
}
