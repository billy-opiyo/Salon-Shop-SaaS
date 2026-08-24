import "server-only";

import type { MembershipRole, MembershipStatus } from "@prisma/client";

export type TenantPermission =
  | "canManageAdmins"
  | "canManageBookings"
  | "canManageContent"
  | "canManageSecurity";

export interface TenantMembershipContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly role: MembershipRole;
  readonly status: MembershipStatus;
  readonly canManageAdmins: boolean;
  readonly canManageBookings: boolean;
  readonly canManageContent: boolean;
  readonly canManageSecurity: boolean;
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN" as const;

  constructor(message = "You are not authorized to access this tenant resource.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function assertTenantMembership(
  membership: TenantMembershipContext | null,
  tenantId: string,
): TenantMembershipContext {
  if (!membership || membership.tenantId !== tenantId || membership.status !== "ACTIVE") {
    throw new AuthorizationError();
  }
  return membership;
}

export function assertTenantPermission(
  membership: TenantMembershipContext,
  permission: TenantPermission,
): void {
  if (membership.role === "OWNER") return;
  if (!membership[permission]) {
    throw new AuthorizationError(`Missing tenant permission: ${permission}`);
  }
}
