export const STOREFRONT_SECTION_KEYS = [
	"gallery",
	"services",
	"booking",
	"testimonials",
	"blog",
	"visit",
	"contact",
] as const

export type StorefrontSectionKey = (typeof STOREFRONT_SECTION_KEYS)[number]

export interface StorefrontSectionCopy {
	readonly gallerySubtitle: string
	readonly galleryTitle: string
	readonly galleryDescription: string
	readonly servicesSubtitle: string
	readonly servicesTitle: string
	readonly servicesDescription: string
	readonly bookingSubtitle: string
	readonly bookingTitle: string
	readonly bookingDescription: string
	readonly testimonialsSubtitle: string
	readonly testimonialsTitle: string
	readonly testimonialsDescription: string
	readonly blogSubtitle: string
	readonly blogTitle: string
	readonly blogDescription: string
	readonly visitSubtitle: string
	readonly visitTitle: string
	readonly visitDescription: string
	readonly contactTitle: string
	readonly contactDescription: string
	readonly footerDescription: string
	readonly craftedBy: string
	readonly copyright: string
}

export interface StorefrontVisibility {
	readonly gallery: boolean
	readonly services: boolean
	readonly booking: boolean
	readonly testimonials: boolean
	readonly blog: boolean
	readonly visit: boolean
	readonly contact: boolean
}

export interface StorefrontDesignConfig {
	readonly heroDescription: string
	readonly sectionCopy: StorefrontSectionCopy
	readonly sectionVisibility: StorefrontVisibility
	readonly mapEmbedUrl: string
}

export const DEFAULT_STOREFRONT_DESIGN: StorefrontDesignConfig = {
	heroDescription: "From signature braids, hair services and flawless twists to glowing beauty spa rituals, precision nails, radiant makeup, barber grooming, eyebrows & lash enhancements, and bridal-ready glam—step into a full beauty experience crafted to make you shine.",
	sectionCopy: {
		gallerySubtitle: "Our Work",
		galleryTitle: "Services Gallery",
		galleryDescription: "Explore signature styles and beauty services from our salon.",
		servicesSubtitle: "What We Offer",
		servicesTitle: "Our Full Salon Services",
		servicesDescription: "Choose a service, then reserve a time that works for you.",
		bookingSubtitle: "Reserve Your Visit",
		bookingTitle: "Book Your Service Session",
		bookingDescription: "Tell us what you need and we will prepare your salon experience.",
		testimonialsSubtitle: "Client Love",
		testimonialsTitle: "What Our Queens Say",
		testimonialsDescription: "★ 5.0 average from 6 reviews",
		blogSubtitle: "Hair Care Tips & Guides",
		blogTitle: "From Our Blog",
		blogDescription: "Get insider tips on braids, natural hair care, skincare, nail health, makeup longevity, grooming routines, lash care, wellness, and bridal beauty planning from our expert team.",
		visitSubtitle: "Get In Touch",
		visitTitle: "Visit Our Salon",
		visitDescription: "We’d love to hear from you. Visit us or reach out through any of the channels below.",
		contactTitle: "Contact Us",
		contactDescription: "Have a question or a special request? Send us a message and our team will get back to you.",
		footerDescription: "A thoughtful salon experience for your signature look.",
		craftedBy: "Powered by Beauty Sphia",
		copyright: "© Royal Braids. All rights reserved.",
	},
	sectionVisibility: {
		gallery: true,
		services: true,
		booking: true,
		testimonials: true,
		blog: true,
		visit: true,
		contact: true,
	},
	// Preserve the legacy Royal Braids Visit Us map until an owner explicitly
	// replaces it in Store Design.
	mapEmbedUrl:
		"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8199!2d36.8075!3d-1.2644!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f17390b2f4643%3A0x4b25b087296c88f7!2sWestlands%2C+Nairobi!5e0!3m2!1sen!2ske!4v1",
}
