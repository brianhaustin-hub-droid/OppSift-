import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthProvider";
import { neonClient } from "../auth/neon-client";

export type OrganizationRole = "owner" | "admin" | "member" | "viewer";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: string;
  country_code: string | null;
  website: string | null;
  description: string | null;
};

type Membership = {
  organization_id: string;
  role: OrganizationRole;
};

type OrganizationContextValue = {
  organizations: Organization[];
  activeOrganization: Organization | null;
  activeRole: OrganizationRole | null;
  loading: boolean;
  error: string;
  setActiveOrganization: (id: string) => void;
  createOrganization: (input: {
    name: string;
    slug: string;
    organizationType: string;
    countryCode: string | null;
    website: string | null;
    description: string | null;
  }) => Promise<void>;
  updateOrganization: (input: {
    id: string;
    name: string;
    organizationType: string;
    countryCode: string | null;
    website: string | null;
    description: string | null;
  }) => Promise<void>;
  reload: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);
const STORAGE_KEY_PREFIX = "oppsift-active-organization:";
const roles = new Set<OrganizationRole>(["owner", "admin", "member", "viewer"]);

function requestError(error: unknown) {
  return error instanceof Error ? error.message : "The organization request failed.";
}

function readMemberships(value: unknown): Membership[] {
  if (!Array.isArray(value)) {
    throw new Error("The organization membership response is invalid.");
  }
  return value.map((item): Membership => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("organization_id" in item) ||
      typeof item.organization_id !== "string" ||
      !("role" in item) ||
      typeof item.role !== "string" ||
      !roles.has(item.role as OrganizationRole)
    ) {
      throw new Error("The organization membership response contains an invalid entry.");
    }
    return { organization_id: item.organization_id, role: item.role as OrganizationRole };
  });
}

function readOrganizations(value: unknown): Organization[] {
  if (!Array.isArray(value)) {
    throw new Error("The organization list response is invalid.");
  }
  return value.map((item): Organization => {
    if (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      typeof item.id === "string" &&
      "name" in item &&
      typeof item.name === "string" &&
      "slug" in item &&
      typeof item.slug === "string" &&
      "organization_type" in item &&
      typeof item.organization_type === "string" &&
      "country_code" in item &&
      (typeof item.country_code === "string" || item.country_code === null) &&
      "website" in item &&
      (typeof item.website === "string" || item.website === null) &&
      "description" in item &&
      (typeof item.description === "string" || item.description === null)
    ) {
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        organization_type: item.organization_type,
        country_code: item.country_code,
        website: item.website,
        description: item.description,
      };
    }
    throw new Error("The organization list response contains an invalid entry.");
  });
}

function readStoredOrganization(userId: string) {
  try {
    return window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
  } catch (error) {
    console.error("Unable to read the active organization preference.", error);
    return null;
  }
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { configured, user } = useAuth();
  const userId = user?.id;
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    if (!configured || !userId || !neonClient) {
      setOrganizations([]);
      setMemberships([]);
      setLoading(false);
      setError("");
      setLoadedForUserId(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const membershipResult = await neonClient
        .from("organization_memberships")
        .select("organization_id, role")
        .eq("user_id", userId)
        .eq("status", "active");
      if (membershipResult.error) throw new Error(membershipResult.error.message);
      const nextMemberships = readMemberships(membershipResult.data);
      const organizationIds = [...new Set(nextMemberships.map((row) => row.organization_id))];
      if (organizationIds.length === 0) {
        if (id === requestId.current) {
          setMemberships([]);
          setOrganizations([]);
          setSelectedId(null);
          setLoadedForUserId(userId);
        }
        return;
      }

      const organizationResult = await neonClient
        .from("organizations")
        .select("id, name, slug, organization_type, country_code, website, description")
        .in("id", organizationIds)
        .eq("status", "active");
      if (organizationResult.error) throw new Error(organizationResult.error.message);
      const nextOrganizations = readOrganizations(organizationResult.data);
      if (id !== requestId.current) return;

      setMemberships(nextMemberships);
      setOrganizations(nextOrganizations);
      setLoadedForUserId(userId);
      const preferredId = readStoredOrganization(userId);
      setSelectedId(
        nextOrganizations.some((organization) => organization.id === preferredId)
          ? preferredId
          : nextOrganizations[0]?.id ?? null,
      );
    } catch (loadError) {
      if (id === requestId.current) {
        setOrganizations([]);
        setMemberships([]);
        setLoadedForUserId(userId);
        setError(requestError(loadError));
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [configured, userId]);

  useEffect(() => {
    void reload();
    return () => {
      requestId.current += 1;
    };
  }, [reload]);

  const currentUserOrganizations = useMemo(
    () => (userId && loadedForUserId === userId ? organizations : []),
    [userId, loadedForUserId, organizations],
  );
  const activeOrganization =
    currentUserOrganizations.find((organization) => organization.id === selectedId) ?? null;
  const activeRole =
    (userId && loadedForUserId === userId
      ? memberships.find((membership) => membership.organization_id === selectedId)?.role
      : null) ?? null;

  const setActiveOrganization = useCallback((id: string) => {
    if (!currentUserOrganizations.some((organization) => organization.id === id)) {
      throw new Error("The selected organization is not available to this account.");
    }
    setSelectedId(id);
    try {
      if (userId) window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, id);
    } catch (storageError) {
      console.error("Unable to save the active organization preference.", storageError);
    }
  }, [currentUserOrganizations, userId]);

  const createOrganization = useCallback(async (input: {
    name: string;
    slug: string;
    organizationType: string;
    countryCode: string | null;
    website: string | null;
    description: string | null;
  }) => {
    if (!neonClient || !userId) throw new Error("Sign in before creating an organization.");
    const result = await neonClient.rpc("create_organization", {
      p_name: input.name,
      p_slug: input.slug,
      p_organization_type: input.organizationType,
      p_country_code: input.countryCode,
      p_website: input.website,
      p_description: input.description,
    });
    if (result.error) throw new Error(result.error.message);
    if (typeof result.data !== "string" || !result.data) {
      throw new Error("The organization was not created: the server returned an invalid response.");
    }
    await reload();
    setSelectedId(result.data);
    try {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, result.data);
    } catch (storageError) {
      console.error("Unable to save the active organization preference.", storageError);
    }
  }, [reload, userId]);

  const updateOrganization = useCallback(async (input: {
    id: string;
    name: string;
    organizationType: string;
    countryCode: string | null;
    website: string | null;
    description: string | null;
  }) => {
    if (!neonClient || !userId) throw new Error("Sign in before updating an organization.");
    const result = await neonClient
      .from("organizations")
      .update({
        name: input.name,
        organization_type: input.organizationType,
        country_code: input.countryCode,
        website: input.website,
        description: input.description,
      })
      .eq("id", input.id)
      .select("id")
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (result.data?.id !== input.id) {
      throw new Error("The organization was not updated. Check that you have owner or administrator access.");
    }
    await reload();
  }, [reload, userId]);

  const contextValue = useMemo(
    () => ({
      organizations: currentUserOrganizations,
      activeOrganization,
      activeRole,
      loading: loading || (!!userId && loadedForUserId !== userId),
      error,
      setActiveOrganization,
      createOrganization,
      updateOrganization,
      reload,
    }),
    [
      currentUserOrganizations,
      activeOrganization,
      activeRole,
      loading,
      error,
      userId,
      loadedForUserId,
      setActiveOrganization,
      createOrganization,
      updateOrganization,
      reload,
    ],
  );

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizations() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganizations must be used within an OrganizationProvider.");
  }
  return context;
}
