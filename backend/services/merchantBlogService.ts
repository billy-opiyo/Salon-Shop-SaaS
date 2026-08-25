import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"
import type { BlogMutationInput } from "@shared/validation/merchant"

export class MerchantBlogError extends Error {
	readonly code = "MERCHANT_BLOG_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantBlogError"
	}
}

async function getTenantId(
	userId: string,
	tenantSlug: string,
): Promise<string> {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantBlogError("Store not found.")
	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId: tenant.id, userId } },
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
		assertTenantMembership(membership, tenant.id),
		"canManageContent",
	)
	return tenant.id
}

export async function listBlogsForUser(userId: string, tenantSlug: string) {
	const tenantId = await getTenantId(userId, tenantSlug)
	return prisma.blogPost.findMany({
		where: { tenantId },
		orderBy: { publishDate: "desc" },
		select: {
			id: true,
			title: true,
			slug: true,
			excerpt: true,
			imageUrl: true,
			readTime: true,
			publishDate: true,
			readMoreUrl: true,
			published: true,
		},
	})
}

export async function updateBlogPublication(
	userId: string,
	tenantSlug: string,
	blogId: string,
	published: boolean,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	await prisma.$transaction(async (transaction) => {
		const result = await transaction.blogPost.updateMany({
			where: { id: blogId, tenantId },
			data: { published },
		})
		if (result.count !== 1) throw new MerchantBlogError("Blog post not found.")
		await transaction.adminAuditLog.create({
			data: {
				tenantId,
				actorUserId: userId,
				action: `blog.publication.${published ? "published" : "unpublished"}`,
				resourceType: "blog-post",
				resourceId: blogId,
				metadata: { published } as Prisma.InputJsonValue,
			},
		})
	})
}

export async function deleteBlog(
	userId: string,
	tenantSlug: string,
	blogId: string,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	const result = await prisma.blogPost.deleteMany({
		where: { id: blogId, tenantId },
	})
	if (result.count !== 1) throw new MerchantBlogError("Blog post not found.")
}

export async function createBlogForUser(
	userId: string,
	input: BlogMutationInput,
): Promise<void> {
	const tenantId = await getTenantId(userId, input.tenantSlug)
	const post = await prisma.blogPost.create({
		data: {
			tenantId,
			title: input.title,
			slug: input.slug,
			excerpt: input.excerpt,
			imageUrl: input.imageUrl || null,
			readTime: input.readTime || null,
			publishDate: new Date(`${input.publishDate}T00:00:00.000Z`),
			readMoreUrl: input.readMoreUrl || null,
			published: input.published,
		},
		select: { id: true },
	})
	await prisma.adminAuditLog.create({
		data: {
			tenantId,
			actorUserId: userId,
			action: "blog.created",
			resourceType: "blog-post",
			resourceId: post.id,
		},
	})
}

export async function updateBlogForUser(
	userId: string,
	input: BlogMutationInput & { id: string },
): Promise<void> {
	const tenantId = await getTenantId(userId, input.tenantSlug)
	const result = await prisma.blogPost.updateMany({
		where: { id: input.id, tenantId },
		data: {
			title: input.title,
			slug: input.slug,
			excerpt: input.excerpt,
			imageUrl: input.imageUrl || null,
			readTime: input.readTime || null,
			publishDate: new Date(`${input.publishDate}T00:00:00.000Z`),
			readMoreUrl: input.readMoreUrl || null,
			published: input.published,
		},
	})
	if (result.count !== 1) throw new MerchantBlogError("Blog post not found.")
	await prisma.adminAuditLog.create({
		data: {
			tenantId,
			actorUserId: userId,
			action: "blog.updated",
			resourceType: "blog-post",
			resourceId: input.id,
		},
	})
}
