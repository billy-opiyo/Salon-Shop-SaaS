import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@backend/db/prisma"

export default async function MerchantPreviewPage({
	params,
}: {
	params: Promise<{ tenantSlug: string }>
}) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			slug: true,
			memberships: {
				where: { userId: session.user.id, status: "ACTIVE" },
				select: { status: true, role: true, canManageContent: true },
			},
		},
	})
	const membership = tenant?.memberships[0]
	if (
		!tenant ||
		!membership ||
		(membership.role !== "OWNER" && !membership.canManageContent)
	)
		redirect(`/manage/${tenantSlug}`)
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Storefront preview</p>
					<h1>Preview {tenant.slug}</h1>
					<p className="auth-card__intro">
						Preview the current published storefront in a separate tab.
					</p>
				</div>
				<a
					className="button button--primary"
					href={`/${tenant.slug}`}
					target="_blank"
					rel="noreferrer"
				>
					Open storefront
				</a>
			</header>
		</main>
	)
}
