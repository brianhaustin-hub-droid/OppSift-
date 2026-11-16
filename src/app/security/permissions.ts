export type Permission = "admin:access";
export type PlatformRole = "anonymous" | "member" | "administrator";

const rolePermissions: Readonly<Record<PlatformRole, readonly Permission[]>> = {
  anonymous: [],
  member: [],
  administrator: ["admin:access"],
};

export function hasPermission(
  role: PlatformRole,
  permission: Permission,
): boolean {
  return rolePermissions[role].includes(permission);
}

export const currentPreviewRole: PlatformRole = "anonymous";
