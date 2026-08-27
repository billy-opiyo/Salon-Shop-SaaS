import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getTenantStorefront } from "@backend/services/tenantDirectory"
import { getReferenceSalonMarkup } from "@backend/services/referenceMarkup"
import { ReferenceSalonRuntime } from "@/components/reference/ReferenceSalonRuntime"

interface TenantPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;")
}

function getShortNameHtml(businessName: string): string {
	const words = businessName.trim().split(/\s+/).filter(Boolean)
	if (words.length < 2) return escapeHtml(businessName).toUpperCase()
	const midpoint = Math.ceil(words.length / 2)
	return (
		escapeHtml(words.slice(0, midpoint).join(" ")).toUpperCase() +
		"<br />" +
		escapeHtml(words.slice(midpoint).join(" ")).toUpperCase()
	)
}

function getServiceCategoryKey(category: string): string {
	const value = category.toLowerCase()
	if (value.includes("braid")) return "braids-services"
	if (value.includes("nail")) return "nail-services"
	if (value.includes("makeup")) return "makeup-services"
	if (value.includes("barber")) return "barber-services"
	if (value.includes("massage") || value.includes("wellness"))
		return "massage-wellness"
	if (value.includes("lash") || value.includes("eyebrow"))
		return "eyebrow-lash-services"
	if (value.includes("bridal") || value.includes("event"))
		return "bridal-event-packages"
	if (value.includes("cosmetic") || value.includes("product"))
		return "cosmetics-products"
	if (value.includes("beauty") || value.includes("spa"))
		return "beauty-spa-services"
	return "hair-services"
}

function buildReferenceClientConfig(
	tenant: NonNullable<Awaited<ReturnType<typeof getTenantStorefront>>>,
) {
	const heroImage =
		tenant.heroImageUrl ??
		"/reference/IMG/1000_F_595420115_RZi6MAsq90qVRMfFz37ZKBianocAltUu.jpg"
	const phone = tenant.contact?.phonePrimary ?? "+254 740 470 381"
	const phoneHref = tenant.actionLinks.phoneUrl
	const email = tenant.contact?.emailPrimary ?? "info@royalbraids.ke"
	const bookingEmail = tenant.contact?.emailBookings ?? email
	const services = tenant.services.map((service) => ({
		name: service.name,
		desc: service.description,
		price: service.priceLabel,
		duration:
			service.durationMinutes > 0
				? service.durationMinutes + " min"
				: "Order via WhatsApp",
		category: getServiceCategoryKey(service.category),
		orderOnly: service.isCosmeticProduct === true,
	}))
	const gallery = tenant.gallery.map((item) => ({
		id: item.id,
		styleName: item.title,
		serviceCategory: item.category,
		imageUrl: item.imageUrl,
	}))
	const testimonials = tenant.reviews.map((review) => ({
		name: review.author,
		rating: review.rating,
		text: review.text,
		status: "approved",
	}))
	const blogs = tenant.blogPosts.map((post) => ({
		slug: post.slug,
		title: post.title,
		excerpt: post.excerpt,
		category: post.category,
		readMoreUrl: post.slug ? `#blog-${post.slug}` : "#blog",
	}))

	return {
		client: { name: tenant.businessName },
		brand: {
			businessName: tenant.businessName,
			shortNameHtml: getShortNameHtml(tenant.businessName),
			logoSrc: tenant.logoUrl ?? "/reference/IMG/logo.png",
			logoAlt: tenant.businessName + " logo",
			heroImage,
			heroImageAlt: tenant.businessName + " salon",
			heroSubtitle:
				tenant.heroSubtitle ?? "Hair, beauty, and self-care made personal",
			heroTitleHtml:
				tenant.heroTitle ?? "Feel confident in your signature look",
			heroDescription: tenant.shortDescription,
			favicon: tenant.logoUrl ?? "/reference/IMG/Royal Braids logo.png",
		},
		appearance: { mode: tenant.theme.mode, preset: tenant.theme.preset },
		seo: {
			title: tenant.businessName + " | Premium African Hair Braiding Salon",
			description: tenant.shortDescription,
			keywords: tenant.businessName + ", salon, braids, beauty",
			ogTitle: tenant.businessName + " | Premium African Hair Braiding & Salon",
			ogImage: heroImage,
		},
		contact: {
			phonePrimary: phone,
			phonePrimaryHref: phoneHref,
			phoneSecondary: tenant.contact?.phoneSecondary ?? phone,
			phoneSecondaryHref: tenant.contact?.phoneSecondary
				? `tel:${tenant.contact.phoneSecondary}`
				: phoneHref,
			emailPrimary: email,
			emailPrimaryHref: `mailto:${email}`,
			emailBookings: bookingEmail,
			emailBookingsHref: `mailto:${bookingEmail}`,
			locationShort: tenant.locationLabel,
			addressHtml: tenant.contact?.address ?? tenant.locationLabel,
		},
		social: { whatsapp: tenant.actionLinks.whatsappUrl },
		catalog: { services, gallery, testimonials, blogs },
	} satisfies Readonly<Record<string, unknown>>
}

export async function generateMetadata({
	params,
}: TenantPageProps): Promise<Metadata> {
	const { tenantSlug } = await params
	const tenant = await getTenantStorefront(tenantSlug)
	if (!tenant) return { title: "Salon store not found" }

	return {
		title: tenant.businessName + " | Premium African Hair Braiding Salon",
		description: tenant.shortDescription,
	}
}

export async function renderTenantStorefront(tenantSlug: string) {
	const tenant = await getTenantStorefront(tenantSlug)
	if (!tenant) notFound()

	const referenceMarkup = await getReferenceSalonMarkup()

	return (
		<ReferenceSalonRuntime
			markup={referenceMarkup.html}
			bodyClassName={referenceMarkup.bodyClassName}
			tenantSlug={tenant.slug}
			turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
			clientConfig={buildReferenceClientConfig(tenant)}
		/>
	)
}

export default async function TenantStorefront({ params }: TenantPageProps) {
	const { tenantSlug } = await params
	return renderTenantStorefront(tenantSlug)
}
