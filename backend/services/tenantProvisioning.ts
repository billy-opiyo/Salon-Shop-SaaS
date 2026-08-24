import "server-only";

import { Prisma, TenantStatus } from "@prisma/client";

import { prisma } from "@backend/db/prisma";
import { assertTenantMembership, assertTenantPermission } from "@backend/services/authorization";
import { PLAN_ENTITLEMENTS } from "@shared/constants/plans";
import {
  createTenantSchema,
  type CreateTenantInput,
} from "@shared/validation/tenant";

const DEFAULT_CATEGORIES = [
  { key: "hair", label: "Hair", sortOrder: 10 },
  { key: "braids", label: "Braids", sortOrder: 20 },
  { key: "nails", label: "Nails", sortOrder: 30 },
  { key: "beauty", label: "Beauty", sortOrder: 40 },
] as const;

export class TenantProvisioningError extends Error {
  readonly code = "TENANT_PROVISIONING_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "TenantProvisioningError";
  }
}

export async function provisionTenant(userId: string, rawInput: CreateTenantInput) {
  const input = createTenantSchema.parse(rawInput);
  const entitlement = PLAN_ENTITLEMENTS[input.planTier];

  try {
    return await prisma.$transaction(async (transaction) => {
      const plan = await transaction.plan.upsert({
        where: { tier: input.planTier.toUpperCase() as "STARTER" | "BUSINESS" | "ENTERPRISE" },
        update: {
          displayName: input.planTier[0].toUpperCase() + input.planTier.slice(1),
          entitlements: entitlement as unknown as Prisma.InputJsonValue,
        },
        create: {
          tier: input.planTier.toUpperCase() as "STARTER" | "BUSINESS" | "ENTERPRISE",
          displayName: input.planTier[0].toUpperCase() + input.planTier.slice(1),
          entitlements: entitlement as unknown as Prisma.InputJsonValue,
        },
      });

      const tenant = await transaction.tenant.create({
        data: {
          slug: input.slug,
          businessName: input.businessName,
          country: input.country,
          city: input.city,
          timezone: input.timezone,
          locale: input.locale,
          currency: input.currency,
          status: TenantStatus.DRAFT,
          ownerUserId: userId,
          createdByUserId: userId,
          settings: { create: { themePreset: "gold", themeMode: "dark" } },
          memberships: {
            create: {
              userId,
              role: "OWNER",
              status: "ACTIVE",
              canManageAdmins: true,
              canManageBookings: true,
              canManageContent: true,
              canManageSecurity: true,
              joinedAt: new Date(),
            },
          },
          subscription: {
            create: {
              planId: plan.id,
              status: "trialing",
            },
          },
          categories: { create: [...DEFAULT_CATEGORIES] },
        },
        select: { id: true, slug: true, businessName: true, status: true },
      });

      return tenant;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new TenantProvisioningError("That store address is already in use.");
    }
    throw new TenantProvisioningError("The store could not be created. Please try again.");
  }
}

export async function listTenantsForUser(userId: string) {
  return prisma.tenant.findMany({
    where: {
      memberships: { some: { userId, status: "ACTIVE" } },
    },
    select: {
      id: true,
      slug: true,
      businessName: true,
      status: true,
      subscription: { select: { plan: { select: { tier: true, displayName: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function publishTenantForUser(userId: string, tenantId: string) {
  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { tenantId: true, userId: true, role: true, status: true, canManageContent: true, canManageAdmins: true, canManageBookings: true, canManageSecurity: true },
  });
  assertTenantPermission(assertTenantMembership(membership, tenantId), "canManageContent");
  const result = await prisma.tenant.updateMany({
    where: { id: tenantId, status: "DRAFT" },
    data: { status: "ACTIVE" },
  });
  if (result.count !== 1) throw new TenantProvisioningError("This store is already published or unavailable.");
}
