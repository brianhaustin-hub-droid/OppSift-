import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { neonClient } from "../auth/neon-client";
import { RouteLink, useNavigate } from "../routing/router";
import {
  useOrganizations,
  type Organization,
  type OrganizationRole,
} from "./OrganizationProvider";

type OrganizationMember = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: OrganizationRole;
  status: string;
  created_at: string;
};

type OrganizationInvitation = {
  id: string;
  invited_email: string;
  role: Exclude<OrganizationRole, "owner">;
  status: string;
  expires_at: string;
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function isOrganizationRole(value: string): value is OrganizationRole {
  return ["owner", "admin", "member", "viewer"].includes(value);
}

function isInvitationRole(value: string): value is OrganizationInvitation["role"] {
  return ["admin", "member", "viewer"].includes(value);
}

function normalizeMembers(value: unknown): OrganizationMember[] {
  if (!Array.isArray(value)) throw new Error("The member list response is invalid.");
  return value.map((row): OrganizationMember => {
    if (
      typeof row !== "object" ||
      row === null ||
      !("user_id" in row) ||
      typeof row.user_id !== "string" ||
      !("email" in row) ||
      typeof row.email !== "string" ||
      !("role" in row) ||
      typeof row.role !== "string" ||
      !isOrganizationRole(row.role) ||
      !("status" in row) ||
      typeof row.status !== "string" ||
      !("created_at" in row) ||
      typeof row.created_at !== "string" ||
      !("display_name" in row) ||
      (typeof row.display_name !== "string" && row.display_name !== null)
    ) {
      throw new Error("The member list contains an invalid entry.");
    }
    return {
      user_id: row.user_id,
      email: row.email,
      display_name: row.display_name,
      role: row.role,
      status: row.status,
      created_at: row.created_at,
    };
  });
}

function normalizeInvitations(value: unknown): OrganizationInvitation[] {
  if (!Array.isArray(value)) throw new Error("The invitation list response is invalid.");
  return value.map((row): OrganizationInvitation => {
    if (
      typeof row !== "object" ||
      row === null ||
      !("id" in row) ||
      typeof row.id !== "string" ||
      !("invited_email" in row) ||
      typeof row.invited_email !== "string" ||
      !("role" in row) ||
      typeof row.role !== "string" ||
      !isInvitationRole(row.role) ||
      !("status" in row) ||
      typeof row.status !== "string" ||
      !("expires_at" in row) ||
      typeof row.expires_at !== "string"
    ) {
      throw new Error("The invitation list contains an invalid entry.");
    }
    return {
      id: row.id,
      invited_email: row.invited_email,
      role: row.role,
      status: row.status,
      expires_at: row.expires_at,
    };
  });
}

function makeSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function CreateOrganizationForm() {
  const { createOrganization } = useOrganizations();
  const [name, setName] = useState("");
  const [organizationType, setOrganizationType] = useState("company");
  const [countryCode, setCountryCode] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const slug = makeSlug(name);
      if (slug.length < 2) throw new Error("Enter an organization name with at least two letters or numbers.");
      await createOrganization({
        name: name.trim(),
        slug,
        organizationType,
        countryCode: countryCode.trim().toUpperCase() || null,
        website: website.trim() || null,
        description: description.trim() || null,
      });
      setName("");
      setCountryCode("");
      setWebsite("");
      setDescription("");
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="organization-form" onSubmit={(event) => void submit(event)}>
      <label>
        Organization name
        <input maxLength={160} minLength={2} onChange={(event) => setName(event.currentTarget.value)} required value={name} />
      </label>
      <label>
        Organization type
        <select onChange={(event) => setOrganizationType(event.currentTarget.value)} value={organizationType}>
          <option value="company">Company</option>
          <option value="nonprofit">Nonprofit</option>
          <option value="government">Government</option>
          <option value="education">Education</option>
          <option value="individual">Individual</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Country code (optional)
        <input autoComplete="country" maxLength={2} pattern="[A-Za-z]{2}" placeholder="US" onChange={(event) => setCountryCode(event.currentTarget.value)} value={countryCode} />
      </label>
      <label>
        Website (optional)
        <input maxLength={2048} onChange={(event) => setWebsite(event.currentTarget.value)} type="url" value={website} />
      </label>
      <label>
        Description (optional)
        <textarea maxLength={5000} onChange={(event) => setDescription(event.currentTarget.value)} rows={4} value={description} />
      </label>
      {error && <p className="auth-panel__error" role="alert">{error}</p>}
      <button className="ui-button ui-button--primary" disabled={busy} type="submit">
        {busy ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}

function OrganizationSettingsForm({
  organization,
}: {
  organization: Organization;
}) {
  const { updateOrganization } = useOrganizations();
  const [name, setName] = useState(organization.name);
  const [organizationType, setOrganizationType] = useState(organization.organization_type);
  const [countryCode, setCountryCode] = useState(organization.country_code ?? "");
  const [website, setWebsite] = useState(organization.website ?? "");
  const [description, setDescription] = useState(organization.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(organization.name);
    setOrganizationType(organization.organization_type);
    setCountryCode(organization.country_code ?? "");
    setWebsite(organization.website ?? "");
    setDescription(organization.description ?? "");
  }, [organization]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateOrganization({
        id: organization.id,
        name: name.trim(),
        organizationType,
        countryCode: countryCode.trim().toUpperCase() || null,
        website: website.trim() || null,
        description: description.trim() || null,
      });
      setMessage("Organization settings saved.");
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="organization-form" onSubmit={(event) => void submit(event)}>
      <label>
        Organization name
        <input maxLength={160} minLength={2} onChange={(event) => setName(event.currentTarget.value)} required value={name} />
      </label>
      <label>
        Organization type
        <select onChange={(event) => setOrganizationType(event.currentTarget.value)} value={organizationType}>
          <option value="company">Company</option>
          <option value="nonprofit">Nonprofit</option>
          <option value="government">Government</option>
          <option value="education">Education</option>
          <option value="individual">Individual</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Country code (optional)
        <input maxLength={2} pattern="[A-Za-z]{2}" placeholder="US" onChange={(event) => setCountryCode(event.currentTarget.value)} value={countryCode} />
      </label>
      <label>
        Website (optional)
        <input maxLength={2048} onChange={(event) => setWebsite(event.currentTarget.value)} type="url" value={website} />
      </label>
      <label>
        Description (optional)
        <textarea maxLength={5000} onChange={(event) => setDescription(event.currentTarget.value)} rows={4} value={description} />
      </label>
      {error && <p className="auth-panel__error" role="alert">{error}</p>}
      {message && <p className="auth-panel__message" role="status">{message}</p>}
      <button className="ui-button ui-button--primary" disabled={busy} type="submit">
        {busy ? "Saving…" : "Save organization"}
      </button>
    </form>
  );
}

function TeamWorkspace() {
  const { user } = useAuth();
  const {
    activeOrganization,
    activeRole,
    error: organizationError,
    loading: organizationsLoading,
    organizations,
    reload: reloadOrganizations,
    setActiveOrganization,
  } = useOrganizations();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOrganizationId, setLoadedOrganizationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviteLink, setInviteLink] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const canManage = activeRole === "owner" || activeRole === "admin";
  const teamRequestId = useRef(0);

  const loadTeam = useCallback(async () => {
    const requestId = ++teamRequestId.current;
    if (!neonClient || !activeOrganization) {
      setMembers([]);
      setInvitations([]);
      setError("");
      setLoadedOrganizationId(null);
      setLoading(false);
      return;
    }

    if (!canManage) {
      setMembers([]);
      setInvitations([]);
      setError("");
      setLoadedOrganizationId(activeOrganization.id);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadedOrganizationId(null);
    setMembers([]);
    setInvitations([]);
    setError("");
    try {
      const [memberResult, invitationResult] = await Promise.all([
        neonClient.rpc("list_organization_members", {
          p_organization_id: activeOrganization.id,
        }),
        neonClient
          .from("organization_invitations")
          .select("id, invited_email, role, status, expires_at")
          .eq("organization_id", activeOrganization.id)
          .eq("status", "pending"),
      ]);
      if (memberResult.error) throw new Error(memberResult.error.message);
      if (invitationResult.error) throw new Error(invitationResult.error.message);
      if (requestId !== teamRequestId.current) return;
      setMembers(normalizeMembers(memberResult.data));
      setInvitations(normalizeInvitations(invitationResult.data));
      setLoadedOrganizationId(activeOrganization.id);
    } catch (loadError) {
      if (requestId !== teamRequestId.current) return;
      setError(errorText(loadError));
      setMembers([]);
      setInvitations([]);
      setLoadedOrganizationId(activeOrganization.id);
    } finally {
      if (requestId === teamRequestId.current) setLoading(false);
    }
  }, [activeOrganization, canManage]);

  useEffect(() => {
    setInviteLink("");
    setCopyMessage("");
    void loadTeam();
    return () => {
      teamRequestId.current += 1;
    };
  }, [loadTeam]);

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!neonClient || !activeOrganization) return;
    setError("");
    setCopyMessage("");
    try {
      const result = await neonClient.rpc("issue_organization_invitation", {
        p_organization_id: activeOrganization.id,
        p_email: email.trim(),
        p_role: inviteRole,
      });
      if (result.error) throw new Error(result.error.message);
      const rows = Array.isArray(result.data) ? result.data : [];
      const token =
        typeof rows[0] === "object" &&
        rows[0] !== null &&
        "invitation_token" in rows[0] &&
        typeof rows[0].invitation_token === "string"
          ? rows[0].invitation_token
          : null;
      if (!token) throw new Error("The invitation was created without a usable link token.");
      setInviteLink(`${window.location.origin}/accept-invitation#token=${encodeURIComponent(token)}`);
      setEmail("");
      await loadTeam();
    } catch (requestError) {
      setError(errorText(requestError));
    }
  }

  async function updateMemberRole(member: OrganizationMember, role: string) {
    if (!neonClient || !activeOrganization) return;
    setError("");
    try {
      const result = await neonClient.rpc("change_organization_member_role", {
        p_organization_id: activeOrganization.id,
        p_user_id: member.user_id,
        p_role: role,
      });
      if (result.error) throw new Error(result.error.message);
      if (result.data !== true) throw new Error("The role change was not authorized or the member is no longer active.");
      await loadTeam();
    } catch (requestError) {
      setError(errorText(requestError));
      await loadTeam();
    }
  }

  async function removeMember(member: OrganizationMember) {
    if (!neonClient || !activeOrganization) return;
    setError("");
    try {
      const result = await neonClient.rpc("remove_organization_member", {
        p_organization_id: activeOrganization.id,
        p_user_id: member.user_id,
      });
      if (result.error) throw new Error(result.error.message);
      if (result.data !== true) throw new Error("The member could not be removed. Owner and administrator restrictions may apply.");
      await loadTeam();
      if (member.user_id === user?.id) {
        await reloadOrganizations();
      }
    } catch (requestError) {
      setError(errorText(requestError));
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!neonClient) return;
    setError("");
    try {
      const result = await neonClient.rpc("revoke_organization_invitation", {
        p_invitation_id: invitationId,
      });
      if (result.error) throw new Error(result.error.message);
      if (result.data !== true) throw new Error("The invitation could not be revoked.");
      await loadTeam();
    } catch (requestError) {
      setError(errorText(requestError));
    }
  }

  async function transferOwnership(userId: string) {
    if (!neonClient || !activeOrganization) return;
    setError("");
    try {
      const result = await neonClient.rpc("transfer_organization_ownership", {
        p_organization_id: activeOrganization.id,
        p_new_owner_user_id: userId,
      });
      if (result.error) throw new Error(result.error.message);
      if (result.data !== true) throw new Error("Ownership could not be transferred.");
      await reloadOrganizations();
      await loadTeam();
    } catch (requestError) {
      setError(errorText(requestError));
    }
  }

  async function copyInvitationLink() {
    if (!navigator.clipboard) {
      setCopyMessage("Clipboard access is unavailable. Select and copy the link manually.");
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyMessage("Invitation link copied. Share it only with the invited person.");
    } catch (copyError) {
      setCopyMessage(errorText(copyError));
    }
  }

  if (organizationsLoading) return <p role="status">Loading organization access…</p>;

  return (
    <div className="organization-page">
      {organizationError && <p className="auth-panel__error" role="alert">{organizationError}</p>}
      {organizations.length > 0 && (
        <label className="organization-switcher">
          Active organization
          <select
            onChange={(event) => setActiveOrganization(event.currentTarget.value)}
            value={activeOrganization?.id ?? ""}
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
        </label>
      )}
      {!activeOrganization ? (
        <section className="organization-section">
          <h2>Create your organization</h2>
          <p>Organization data is tenant-scoped and protected by database row-level security.</p>
          <CreateOrganizationForm />
        </section>
      ) : (
        <>
          <section className="organization-section">
            <h2>{activeOrganization.name}</h2>
            <p>
              {activeOrganization.organization_type} · Your role: <strong>{activeRole}</strong>
            </p>
            {activeOrganization.country_code && <p>Country: {activeOrganization.country_code}</p>}
            {activeOrganization.website && <p>Website: {activeOrganization.website}</p>}
            {activeOrganization.description && <p>{activeOrganization.description}</p>}
            {canManage && (
              <details>
                <summary>Edit organization settings</summary>
                <OrganizationSettingsForm organization={activeOrganization} />
              </details>
            )}
            {canManage && (
              <form className="organization-form organization-form--inline" onSubmit={(event) => void inviteMember(event)}>
                <label>
                  Invite by email
                  <input autoComplete="email" onChange={(event) => setEmail(event.currentTarget.value)} required type="email" value={email} />
                </label>
                <label>
                  Role
                  <select onChange={(event) => setInviteRole(event.currentTarget.value as "admin" | "member" | "viewer")} value={inviteRole}>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                    {activeRole === "owner" && <option value="admin">Admin</option>}
                  </select>
                </label>
                <button className="ui-button ui-button--primary" type="submit">Create invite link</button>
              </form>
            )}
            {inviteLink && (
              <div className="invitation-link">
                <p>This invitation link is shown once. Copy and share it with the invited person.</p>
                <input aria-label="One-time invitation link" readOnly value={inviteLink} />
                <button className="ui-button ui-button--secondary" onClick={() => void copyInvitationLink()} type="button">Copy link</button>
                {copyMessage && <p role="status">{copyMessage}</p>}
              </div>
            )}
          </section>
          {error && <p className="auth-panel__error" role="alert">{error}</p>}
          <section className="organization-section">
            <h2>Team members</h2>
            {!canManage ? <p>Only organization owners and administrators can view the member directory.</p> : loading || loadedOrganizationId !== activeOrganization.id ? <p role="status">Loading members…</p> : members.length === 0 ? <p>No members were returned.</p> : (
              <div className="organization-table-wrap" role="region" aria-label="Team members" tabIndex={0}>
                <table className="organization-table">
                  <thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Status</th>{canManage && <th scope="col">Actions</th>}</tr></thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.user_id}>
                        <td>{member.display_name || member.email}<small>{member.display_name ? member.email : member.user_id}</small></td>
                        <td>{canManage && member.status === "active" && member.role !== "owner" && !(activeRole === "admin" && member.role === "admin") ? (
                          <select
                            aria-label={`Role for ${member.email}`}
                            onChange={(event) => void updateMemberRole(member, event.currentTarget.value)}
                            value={member.role}
                          >
                            {activeRole === "owner" && <option value="admin">Admin</option>}<option value="member">Member</option><option value="viewer">Viewer</option>
                          </select>
                        ) : member.role}</td>
                        <td>{member.status}</td>
                        {canManage && <td className="organization-table__actions">
                          {activeRole === "owner" && member.role !== "owner" && <button className="ui-button ui-button--tertiary ui-button--sm" onClick={() => void transferOwnership(member.user_id)} type="button">Transfer ownership</button>}
                          {member.status === "active" && member.role !== "owner" && <button className="ui-button ui-button--danger ui-button--sm" onClick={() => void removeMember(member)} type="button">Remove</button>}
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {canManage && (
            <section className="organization-section">
              <h2>Pending invitations</h2>
              {loadedOrganizationId !== activeOrganization.id ? <p role="status">Loading invitations…</p> : invitations.length === 0 ? <p>No pending invitations.</p> : (
                <ul className="invitation-list">
                  {invitations.map((invitation) => (
                    <li key={invitation.id}>
                      <span>{invitation.invited_email} · {invitation.role}</span>
                      <button className="ui-button ui-button--secondary ui-button--sm" onClick={() => void revokeInvitation(invitation.id)} type="button">Revoke</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function OrganizationsPage() {
  return (
    <div className="platform-page">
      <header className="page-heading">
        <div className="page-heading__copy">
          <p className="page-heading__eyebrow">Organization access</p>
          <h1>Organizations &amp; teams</h1>
          <p className="page-heading__description">Manage organization membership and invitations.</p>
        </div>
      </header>
      <TeamWorkspace />
    </div>
  );
}

export function AcceptInvitationPage() {
  const { configured, loading, user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "",
  );

  useEffect(() => {
    if (!token || !window.location.hash) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, [token]);

  async function respond(action: "accept" | "decline") {
    if (!neonClient) return;
    setBusy(true);
    setError("");
    try {
      const result = await neonClient.rpc(
        action === "accept" ? "accept_organization_invitation" : "decline_organization_invitation",
        { p_token: token },
      );
      if (result.error) throw new Error(result.error.message);
      if (result.data !== true) throw new Error("This invitation is invalid, expired, already used, or belongs to a different verified email address.");
      if (action === "accept") {
        setMessage("Invitation accepted. Your organization access is ready.");
        window.setTimeout(() => navigate("/teams"), 800);
      } else {
        setMessage("Invitation declined.");
      }
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return <section className="auth-panel"><h1>Invitations aren’t configured</h1><p>Connect Neon Managed Auth and the Neon Data API to manage invitations.</p></section>;
  }
  if (loading) return <section className="auth-panel"><h1>Checking your account</h1><p role="status">Loading session…</p></section>;
  if (!user) {
    const returnTo = `/accept-invitation#token=${encodeURIComponent(token)}`;
    return (
      <section className="auth-panel">
        <h1>Sign in to continue</h1>
        <p>Use the account with the verified email address that received this invitation.</p>
        <RouteLink className="ui-button ui-button--primary" href={`/login?redirectTo=${encodeURIComponent(returnTo)}`}>Sign in</RouteLink>
      </section>
    );
  }
  if (!user.emailVerified) {
    return (
      <section className="auth-panel">
        <h1>Verify your email first</h1>
        <p>Sign in with the invited address and verify it before responding to this invitation.</p>
        <RouteLink className="ui-button ui-button--secondary" href={`/verify-email?email=${encodeURIComponent(user.email)}`}>Verify email</RouteLink>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <p className="page-heading__eyebrow">Organization invitation</p>
      <h1>Respond to invitation</h1>
      <p>Signed in as {user.email}. The server verifies that this is the invited account.</p>
      {!token && <p className="auth-panel__error" role="alert">This invitation link is missing its token.</p>}
      {error && <p className="auth-panel__error" role="alert">{error}</p>}
      {message && <p className="auth-panel__message" role="status">{message}</p>}
      <div className="invitation-actions">
        <button className="ui-button ui-button--primary" disabled={busy || !token} onClick={() => void respond("accept")} type="button">Accept invitation</button>
        <button className="ui-button ui-button--secondary" disabled={busy || !token} onClick={() => void respond("decline")} type="button">Decline</button>
      </div>
    </section>
  );
}
