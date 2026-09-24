import "server-only"

import { Prisma, TenantStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"
import {
	CURRENT_PRICE_VERSION,
	BILLING_POLICY,
	addCalendarMonths,
	PLAN_ENTITLEMENTS,
	PLAN_PRICING,
} from "@shared/constants/plans"
import {
	DEFAULT_SALON_CATEGORIES,
	DEFAULT_SALON_SERVICES,
	slugifyDefaultService,
} from "@shared/constants/legacySalonCatalog"
import {
	createTenantSchema,
	type CreateTenantInput,
} from "@shared/validation/tenant"

export class TenantProvisioningError extends Error {
	readonly code = "TENANT_PROVISIONING_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "TenantProvisioningError"
	}
}

export async function provisionTenant(
	userId: string,
	rawInput: CreateTenantInput,
) {
	const input = createTenantSchema.parse(rawInput)
	const entitlement = PLAN_ENTITLEMENTS[input.planTier]

	try {
		return await prisma.$transaction(async (transaction) => {
			const now = new Date()
			const plan = await transaction.plan.upsert({
				where: {
					tier: input.planTier.toUpperCase() as
						| "STARTER"
						| "BUSINESS"
						| "ENTERPRISE",
				},
				update: {
					displayName:
						input.planTier[0].toUpperCase() + input.planTier.slice(1),
					entitlements: entitlement as unknown as Prisma.InputJsonValue,
				},
				create: {
					tier: input.planTier.toUpperCase() as
						| "STARTER"
						| "BUSINESS"
						| "ENTERPRISE",
					displayName:
						input.planTier[0].toUpperCase() + input.planTier.slice(1),
					entitlements: entitlement as unknown as Prisma.InputJsonValue,
				},
			})

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
					settings: {
						create: {
							themePreset: "gold",
							themeMode: "dark",
							heroTitle: input.heroTitle,
							heroSubtitle: input.heroSubtitle,
						},
					},
					memberships: {
						create: {
							userId,
							role: "OWNER",
							status: "ACTIVE",
							canManageAdmins: true,
							canManageBookings: true,
							canManageContent: true,
							canManageSecurity: true,
							canManageBilling: true,
							joinedAt: new Date(),
						},
					},
					subscription: {
						create: {
							planId: plan.id,
							status: "setup_payment_required",
							agreedMonthlyAmountMinor:
								PLAN_PRICING[input.planTier].monthlyAmountMinor,
							priceVersion: CURRENT_PRICE_VERSION,
						},
					},
					categories: {
						create: DEFAULT_SALON_CATEGORIES.map((category) => ({
							key: category.key,
							label: category.label,
							shortLabel: category.shortLabel,
							sortOrder: category.sortOrder,
						})),
					},
					legalAcceptances: {
						create: {
							userId,
							termsVersion: "2026-08-26",
							privacyVersion: "2026-08-26",
							cookiesVersion: "2026-08-26",
						},
					},
					invoices: {
						create: {
							invoiceNumber: `BS-${now.getTime()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
							kind: "setup",
							amountMinor: PLAN_PRICING[input.planTier].setupFeeMinor,
							currency: input.currency,
							description: "Beauty Sphia salon store setup fee",
						},
					},
					},
					select: { id: true, slug: true, businessName: true, status: true },
				})

			const categories = await transaction.serviceCategory.findMany({
				where: { tenantId: tenant.id },
				select: { id: true, key: true },
			})
			const categoryIds = new Map(
				categories.map((category) => [category.key, category.id]),
			)
			await transaction.service.createMany({
				data: DEFAULT_SALON_SERVICES.map((service, index) => ({
					tenantId: tenant.id,
					categoryId: categoryIds.get(service.categoryKey) as string,
					name: service.name,
					slug: slugifyDefaultService(service.name),
					description: service.description,
					priceLabel: service.priceLabel,
					priceMinor: service.priceMinor,
					durationLabel: service.durationLabel,
					orderOnly: service.orderOnly ?? false,
					sortOrder: index,
				})),
			})

			return tenant
		})
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new TenantProvisioningError("That store address is already in use.")
		}
		throw new TenantProvisioningError(
			"The store could not be created. Please try again.",
		)
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
			subscription: {
				select: { plan: { select: { tier: true, displayName: true } } },
			},
		},
		orderBy: { createdAt: "asc" },
	})
}

export async function publishTenantForUser(userId: string, tenantId: string) {
	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId, userId } },
		select: {
			tenantId: true,
			userId: true,
			role: true,
			status: true,
			canManageContent: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageSecurity: true,
		},
	})
	assertTenantPermission(
		assertTenantMembership(membership, tenantId),
		"canManageContent",
	)
	const subscription = await prisma.subscription.findUnique({
		where: { tenantId },
		select: { status: true },
	})
	if (subscription?.status !== "setup_paid_pending_activation")
		throw new TenantProvisioningError(
			"The setup fee must be paid before this store can be activated.",
		)
	const now = new Date()
	const result = await prisma.$transaction(async (transaction) => {
		const tenantUpdate = await transaction.tenant.updateMany({
			where: { id: tenantId, status: "DRAFT" },
			data: { status: "ACTIVE" },
		})
		if (tenantUpdate.count !== 1) return false
		await transaction.subscription.update({
			where: { tenantId },
			data: {
				status: "trialing",
				trialConsumedAt: now,
				trialStartsAt: now,
				trialEndsAt: addCalendarMonths(now, BILLING_POLICY.freeUsageMonths),
				activatedAt: now,
				currentPeriodEnd: addCalendarMonths(now, BILLING_POLICY.freeUsageMonths),
			},
		})
		return true
	})
	if (!result)
		throw new TenantProvisioningError(
			"This store is already published or unavailable.",
		)
}
