import { auth } from "@/auth"
import { prisma } from "@backend/db/prisma"
import { NextResponse } from "next/server"

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;")
}

export async function GET(
	_request: Request,
	props: { params: Promise<{ tenantSlug: string; invoiceId: string }> },
) {
	const session = await auth()
	if (!session?.user?.id)
		return new NextResponse("Unauthorized", { status: 401 })
	const { tenantSlug, invoiceId } = await props.params
	const invoice = await prisma.billingInvoice.findFirst({
		where: {
			id: invoiceId,
			tenant: {
				slug: tenantSlug.trim().toLowerCase(),
				memberships: {
					some: {
						userId: session.user.id,
						status: "ACTIVE",
						role: { in: ["OWNER", "ADMIN"] },
					},
				},
			},
		},
		include: { tenant: { select: { businessName: true, currency: true } } },
	})
	if (!invoice) return new NextResponse("Invoice not found", { status: 404 })
	const amount = new Intl.NumberFormat("en-KE", {
		style: "currency",
		currency: invoice.currency,
	}).format(invoice.amountMinor / 100)
	const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoiceNumber)} - Beauty Sphia</title></head><body><h1>Beauty Sphia</h1><h2>${escapeHtml(invoice.tenant.businessName)}</h2><p>Invoice: ${escapeHtml(invoice.invoiceNumber)}</p><p>${escapeHtml(invoice.description)}</p><p>Amount: ${escapeHtml(amount)}</p><p>Status: ${escapeHtml(invoice.status)}</p><p>Receipt: ${escapeHtml(invoice.receiptNumber ?? "Pending")}</p><p>Created: ${escapeHtml(invoice.createdAt.toISOString())}</p></body></html>`
	return new NextResponse(html, {
		headers: {
			"content-type": "text/html; charset=utf-8",
			"content-disposition": `attachment; filename="${invoice.invoiceNumber}.html"`,
		},
	})
}
