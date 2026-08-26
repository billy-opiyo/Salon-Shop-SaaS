import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class AnalyticsError extends Error {
	readonly code = "ANALYTICS_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "AnalyticsError"
	}
}

export async function assertAnalyticsAccess(
	userId: string,
	tenantId: string,
): Promise<void> {
	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId, userId } },
		select: {
			tenantId: true,
			userId: true,
			role: true,
			status: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageContent: true,
			canManageSecurity: true,
		},
	})
	assertTenantPermission(
		assertTenantMembership(membership, tenantId),
		"canManageBookings",
	)
}

export interface TenantAnalytics {
	totalBookings: number
	confirmedBookings: number
	cancelledBookings: number
	pendingBookings: number
	totalReviews: number
	averageRating: number
	totalMessages: number
	newMessages: number
	uniqueClients: number
	totalWaitlistEntries: number
	activeWaitlistEntries: number
}

export async function getTenantAnalytics(
	tenantId: string,
	dateFrom?: Date,
	dateTo?: Date,
): Promise<TenantAnalytics> {
	const baseFilters = {
		tenantId,
		...(dateFrom || dateTo
			? {
					createdAt: {
						...(dateFrom ? { gte: dateFrom } : {}),
						...(dateTo ? { lte: dateTo } : {}),
					},
				}
			: {}),
	}

	const [
		totalBookings,
		confirmedBookings,
		cancelledBookings,
		pendingBookings,
		totalReviews,
		reviews,
		totalMessages,
		newMessages,
		uniqueClients,
		totalWaitlistEntries,
		activeWaitlistEntries,
	] = await Promise.all([
		prisma.booking.count({ where: baseFilters }),
		prisma.booking.count({
			where: { ...baseFilters, status: "CONFIRMED" },
		}),
		prisma.booking.count({
			where: { ...baseFilters, status: "CANCELLED" },
		}),
		prisma.booking.count({
			where: { ...baseFilters, status: "PENDING" },
		}),
		prisma.review.count({ where: { tenantId } }),
		prisma.review.findMany({
			where: { tenantId },
			select: { rating: true },
		}),
		prisma.contactMessage.count({
			where: { tenantId },
		}),
		prisma.contactMessage.count({
			where: { tenantId, status: "NEW" },
		}),
		prisma.booking.findMany({
			where: baseFilters,
			select: { email: true },
			distinct: ["email"],
		}),
		prisma.waitlistEntry.count({
			where: { tenantId },
		}),
		prisma.waitlistEntry.count({
			where: { tenantId, status: "WAITING" },
		}),
	])

	const avgRating =
		reviews.length > 0
			? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
			: 0

	return {
		totalBookings,
		confirmedBookings,
		cancelledBookings,
		pendingBookings,
		totalReviews,
		averageRating: Math.round(avgRating * 10) / 10,
		totalMessages,
		newMessages,
		uniqueClients: uniqueClients.length,
		totalWaitlistEntries,
		activeWaitlistEntries,
	}
}

export interface BookingAnalytics {
	bookingsByStatus: Record<string, number>
	bookingsByService: Array<{ serviceName: string; count: number }>
	bookingsByStylist: Array<{ stylistName: string; count: number }>
	bookingsByDate: Array<{ date: string; count: number }>
	averageTimeToConfirmation: number
}

export async function getBookingAnalytics(
	tenantId: string,
	dateFrom?: Date,
	dateTo?: Date,
): Promise<BookingAnalytics> {
	const baseFilters = {
		tenantId,
		...(dateFrom || dateTo
			? {
					createdAt: {
						...(dateFrom ? { gte: dateFrom } : {}),
						...(dateTo ? { lte: dateTo } : {}),
					},
				}
			: {}),
	}

	const bookings = await prisma.booking.findMany({
		where: baseFilters,
		select: {
			status: true,
			serviceName: true,
			stylist: { select: { name: true } },
			appointmentDate: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	const byStatus: Record<string, number> = {}
	const byService: Record<string, number> = {}
	const byStylist: Record<string, number> = {}
	const byDate: Record<string, number> = {}
	let confirmationTimes: number[] = []

	for (const booking of bookings) {
		// By status
		byStatus[booking.status] = (byStatus[booking.status] ?? 0) + 1

		// By service
		byService[booking.serviceName] = (byService[booking.serviceName] ?? 0) + 1

		// By stylist
		if (booking.stylist) {
			byStylist[booking.stylist.name] =
				(byStylist[booking.stylist.name] ?? 0) + 1
		}

		// By date
		const dateStr = booking.appointmentDate.toISOString().slice(0, 10)
		byDate[dateStr] = (byDate[dateStr] ?? 0) + 1

		// Confirmation time (if confirmed)
		if (booking.status === "CONFIRMED") {
			const confirmTime =
				booking.updatedAt.getTime() - booking.createdAt.getTime()
			confirmationTimes.push(confirmTime)
		}
	}

	const avgConfirmationTime =
		confirmationTimes.length > 0
			? confirmationTimes.reduce((a, b) => a + b, 0) /
				confirmationTimes.length /
				(1000 * 60) // Convert to minutes
			: 0

	return {
		bookingsByStatus: byStatus,
		bookingsByService: Object.entries(byService)
			.map(([serviceName, count]) => ({ serviceName, count }))
			.sort((a, b) => b.count - a.count),
		bookingsByStylist: Object.entries(byStylist)
			.map(([stylistName, count]) => ({ stylistName, count }))
			.sort((a, b) => b.count - a.count),
		bookingsByDate: Object.entries(byDate)
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => a.date.localeCompare(b.date)),
		averageTimeToConfirmation: Math.round(avgConfirmationTime * 10) / 10,
	}
}

export interface ReviewAnalytics {
	totalReviews: number
	ratingDistribution: Record<number, number>
	approvedReviews: number
	pendingReviews: number
	flaggedReviews: number
	averageRating: number
	reviewsByService: Array<{
		serviceName: string
		count: number
		avgRating: number
	}>
}

export async function getReviewAnalytics(
	tenantId: string,
): Promise<ReviewAnalytics> {
	const reviews = await prisma.review.findMany({
		where: { tenantId },
		select: {
			rating: true,
			status: true,
			serviceName: true,
			reportsCount: true,
		},
	})

	const ratingDist: Record<number, number> = {}
	const byService: Record<string, { count: number; ratings: number[] }> = {}
	let totalRating = 0

	for (const review of reviews) {
		// Distribution
		ratingDist[review.rating] = (ratingDist[review.rating] ?? 0) + 1
		totalRating += review.rating

		// By service
		const serviceName = review.serviceName ?? "unspecified"
		if (!byService[serviceName]) {
			byService[serviceName] = { count: 0, ratings: [] }
		}
		byService[serviceName].count++
		byService[serviceName].ratings.push(review.rating)
	}

	const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0

	return {
		totalReviews: reviews.length,
		ratingDistribution: ratingDist,
		approvedReviews: reviews.filter((r) => r.status === "APPROVED").length,
		pendingReviews: reviews.filter((r) => r.status === "PENDING").length,
		flaggedReviews: reviews.filter((r) => r.reportsCount > 0).length,
		averageRating: Math.round(avgRating * 10) / 10,
		reviewsByService: Object.entries(byService)
			.map(([serviceName, data]) => ({
				serviceName,
				count: data.count,
				avgRating:
					Math.round(
						(data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) *
							10,
					) / 10,
			}))
			.sort((a, b) => b.count - a.count),
	}
}
