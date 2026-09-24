export interface DefaultSalonCategory {
	readonly key: string
	readonly label: string
	readonly shortLabel: string
	readonly sortOrder: number
}

export interface DefaultSalonService {
	readonly categoryKey: string
	readonly name: string
	readonly description: string
	readonly priceLabel: string
	readonly priceMinor: number | null
	readonly durationLabel: string
	readonly orderOnly?: boolean
}

export interface DefaultSalonGalleryItem {
	readonly imageUrl: string
	readonly beforeImageUrl?: string
	readonly title: string
	readonly serviceCategory: string
	readonly serviceName?: string
	readonly styleType: string
	readonly stylistName: string
	readonly length?: string
	readonly size?: string
	readonly timeTaken: string
	readonly priceRange: string
	readonly hairType: string
	readonly featuredTrending?: boolean
	readonly featuredMostBooked?: boolean
}

export interface DefaultSalonReview {
	readonly name: string
	readonly role: string
	readonly text: string
	readonly rating: number
	readonly source: string
}

export interface DefaultSalonBlog {
	readonly title: string
	readonly excerpt: string
	readonly imageUrl: string
	readonly publishDate: string
	readonly readTime: string
	readonly readMoreUrl: string
}

export const DEFAULT_SALON_CATEGORIES: readonly DefaultSalonCategory[] = [
	{ key: "braids-services", label: "Braids Services", shortLabel: "Braids", sortOrder: 10 },
	{ key: "hair-services", label: "Hair Services", shortLabel: "Hair", sortOrder: 20 },
	{ key: "beauty-spa-services", label: "Beauty Spa Services", shortLabel: "Beauty Spa", sortOrder: 30 },
	{ key: "nail-services", label: "Nail Services", shortLabel: "Nails", sortOrder: 40 },
	{ key: "makeup-services", label: "Makeup Services", shortLabel: "Makeup", sortOrder: 50 },
	{ key: "barber-services", label: "Barber Services", shortLabel: "Barber", sortOrder: 60 },
	{ key: "massage-wellness", label: "Massage & Wellness", shortLabel: "Massage", sortOrder: 70 },
	{ key: "eyebrow-lash-services", label: "Eyebrow & Lash Services", shortLabel: "Eyebrows & Lash", sortOrder: 80 },
	{ key: "bridal-event-packages", label: "Bridal / Event Packages", shortLabel: "Bridal / Events", sortOrder: 90 },
	{ key: "cosmetics-products", label: "Cosmetics Products", shortLabel: "Cosmetics", sortOrder: 100 },
]

export const DEFAULT_SALON_SERVICES: readonly DefaultSalonService[] = [
	{ categoryKey: "braids-services", name: "Hair Braiding", description: "Professional protective braiding tailored to your preferred look.", priceLabel: "From KSh 3,000", priceMinor: 300000, durationLabel: "2-5 hrs" },
	{ categoryKey: "braids-services", name: "Box Braids", description: "Classic sectioned braids for a neat, long-lasting protective style.", priceLabel: "From KSh 3,500", priceMinor: 350000, durationLabel: "3-5 hrs" },
	{ categoryKey: "braids-services", name: "Knotless Braids", description: "Lightweight knot-free braids with less tension on the scalp.", priceLabel: "From KSh 4,500", priceMinor: 450000, durationLabel: "4-6 hrs" },
	{ categoryKey: "braids-services", name: "Cornrows", description: "Clean scalp braids in classic straight-back or custom patterns.", priceLabel: "From KSh 1,500", priceMinor: 150000, durationLabel: "1-3 hrs" },
	{ categoryKey: "braids-services", name: "Fulani Braids", description: "Signature center-parted braids with stylish side detailing.", priceLabel: "From KSh 4,000", priceMinor: 400000, durationLabel: "3-5 hrs" },
	{ categoryKey: "braids-services", name: "Stitch Braids", description: "Precise feed-in braids with crisp stitch-like parting lines.", priceLabel: "From KSh 2,500", priceMinor: 250000, durationLabel: "2-4 hrs" },
	{ categoryKey: "braids-services", name: "Faux Locs", description: "Trendy loc-inspired protective style with natural movement.", priceLabel: "From KSh 4,500", priceMinor: 450000, durationLabel: "4-6 hrs" },
	{ categoryKey: "hair-services", name: "Hair Styling", description: "Finish and style your hair for daily elegance or special events.", priceLabel: "From KSh 1,500", priceMinor: 150000, durationLabel: "45-90 mins" },
	{ categoryKey: "hair-services", name: "Hair Cutting", description: "Precision cuts for a polished, healthy shape and finish.", priceLabel: "From KSh 1,200", priceMinor: 120000, durationLabel: "30-60 mins" },
	{ categoryKey: "hair-services", name: "Hair Coloring", description: "Custom coloring, toning, and touch-ups for vibrant results.", priceLabel: "From KSh 3,500", priceMinor: 350000, durationLabel: "2-3 hrs" },
	{ categoryKey: "hair-services", name: "Hair Relaxing", description: "Chemical relaxing service for smooth, manageable hair texture.", priceLabel: "From KSh 2,800", priceMinor: 280000, durationLabel: "1.5-2 hrs" },
	{ categoryKey: "hair-services", name: "Hair Treatment", description: "Moisture and repair treatments to restore hair strength and shine.", priceLabel: "From KSh 2,000", priceMinor: 200000, durationLabel: "1-1.5 hrs" },
	{ categoryKey: "hair-services", name: "Wig Installation", description: "Secure and natural-looking wig installation with perfect blending.", priceLabel: "From KSh 3,000", priceMinor: 300000, durationLabel: "1.5-2.5 hrs" },
	{ categoryKey: "hair-services", name: "Weaving/Extensions", description: "Professional install of weaves and extensions for added volume.", priceLabel: "From KSh 3,500", priceMinor: 350000, durationLabel: "2-4 hrs" },
	{ categoryKey: "hair-services", name: "Hair Washing & Blow Dry", description: "Deep cleanse and smooth blow-dry finish for refreshed hair.", priceLabel: "From KSh 1,500", priceMinor: 150000, durationLabel: "45-75 mins" },
	{ categoryKey: "beauty-spa-services", name: "Facials", description: "Glow-boosting facial care customized to your skin type.", priceLabel: "From KSh 2,500", priceMinor: 250000, durationLabel: "60 mins" },
	{ categoryKey: "beauty-spa-services", name: "Body Scrubs", description: "Exfoliating body treatments for softer, brighter skin.", priceLabel: "From KSh 3,000", priceMinor: 300000, durationLabel: "60-75 mins" },
	{ categoryKey: "beauty-spa-services", name: "Steam Therapy", description: "Relaxing steam sessions to open pores and release tension.", priceLabel: "From KSh 2,000", priceMinor: 200000, durationLabel: "30-45 mins" },
	{ categoryKey: "beauty-spa-services", name: "Skin Treatments", description: "Targeted professional treatment for specific skin concerns.", priceLabel: "From KSh 3,500", priceMinor: 350000, durationLabel: "60-90 mins" },
	{ categoryKey: "beauty-spa-services", name: "Sauna", description: "Detoxifying sauna therapy for wellness and improved circulation.", priceLabel: "From KSh 2,000", priceMinor: 200000, durationLabel: "30-45 mins" },
	{ categoryKey: "beauty-spa-services", name: "Body Polishing", description: "Full-body polish for smoother texture and radiant finish.", priceLabel: "From KSh 3,800", priceMinor: 380000, durationLabel: "75 mins" },
	{ categoryKey: "beauty-spa-services", name: "Acne Treatment", description: "Clarifying care to reduce breakouts and calm inflammation.", priceLabel: "From KSh 3,200", priceMinor: 320000, durationLabel: "60 mins" },
	{ categoryKey: "beauty-spa-services", name: "Skin Brightening", description: "Tone-evening treatment to enhance natural skin radiance.", priceLabel: "From KSh 3,500", priceMinor: 350000, durationLabel: "60 mins" },
	{ categoryKey: "nail-services", name: "Manicure", description: "Classic manicure for clean, polished, healthy-looking nails.", priceLabel: "From KSh 1,200", priceMinor: 120000, durationLabel: "45 mins" },
	{ categoryKey: "nail-services", name: "Pedicure", description: "Foot care and nail grooming for comfort and beauty.", priceLabel: "From KSh 1,500", priceMinor: 150000, durationLabel: "60 mins" },
	{ categoryKey: "nail-services", name: "Gel Polish", description: "High-shine long-wear gel finish with rich color options.", priceLabel: "From KSh 1,800", priceMinor: 180000, durationLabel: "45-60 mins" },
	{ categoryKey: "nail-services", name: "Acrylic Nails", description: "Custom acrylic extensions for durable shape and length.", priceLabel: "From KSh 2,500", priceMinor: 250000, durationLabel: "75-90 mins" },
	{ categoryKey: "nail-services", name: "Nail Art", description: "Creative nail designs, accents, and event-ready detailing.", priceLabel: "From KSh 2,000", priceMinor: 200000, durationLabel: "60-90 mins" },
	{ categoryKey: "nail-services", name: "Nail Repair", description: "Fix broken, chipped, or lifted nails with expert repair care.", priceLabel: "From KSh 800", priceMinor: 80000, durationLabel: "30-45 mins" },
	{ categoryKey: "makeup-services", name: "Bridal Makeup", description: "Premium long-wear bridal glam with trial and customization.", priceLabel: "From KSh 8,000", priceMinor: 800000, durationLabel: "2-3 hrs" },
	{ categoryKey: "makeup-services", name: "Party Makeup", description: "Event-ready makeup with flawless finish and photo-ready look.", priceLabel: "From KSh 3,500", priceMinor: 350000, durationLabel: "75-90 mins" },
	{ categoryKey: "makeup-services", name: "Photoshoot Makeup", description: "Camera-optimized makeup designed for studio and outdoor shoots.", priceLabel: "From KSh 4,500", priceMinor: 450000, durationLabel: "90-120 mins" },
	{ categoryKey: "makeup-services", name: "Everyday Makeup", description: "Soft, natural everyday glam for work and casual outings.", priceLabel: "From KSh 2,500", priceMinor: 250000, durationLabel: "45-60 mins" },
	{ categoryKey: "makeup-services", name: "Eyelash Installation", description: "Precision lash application for fuller, defined eye looks.", priceLabel: "From KSh 1,800", priceMinor: 180000, durationLabel: "45-60 mins" },
	{ categoryKey: "barber-services", name: "Haircuts", description: "Modern and classic cuts tailored for men and boys.", priceLabel: "From KSh 800", priceMinor: 80000, durationLabel: "30-45 mins" },
	{ categoryKey: "barber-services", name: "Beard Grooming", description: "Shape, trim, and style your beard for a clean finish.", priceLabel: "From KSh 700", priceMinor: 70000, durationLabel: "20-30 mins" },
	{ categoryKey: "barber-services", name: "Hair Dye", description: "Color refresh and grey coverage tailored to your preference.", priceLabel: "From KSh 1,500", priceMinor: 150000, durationLabel: "45-60 mins" },
	{ categoryKey: "barber-services", name: "Kids Haircuts", description: "Comfort-first grooming for children in a friendly setup.", priceLabel: "From KSh 600", priceMinor: 60000, durationLabel: "20-30 mins" },
	{ categoryKey: "barber-services", name: "Lineups/Fades", description: "Sharp lineups and clean fade transitions done professionally.", priceLabel: "From KSh 900", priceMinor: 90000, durationLabel: "30-40 mins" },
	{ categoryKey: "massage-wellness", name: "Full Body Massage", description: "Relaxing full-body massage to release stress and fatigue.", priceLabel: "From KSh 4,000", priceMinor: 400000, durationLabel: "60-90 mins" },
	{ categoryKey: "massage-wellness", name: "Deep Tissue Massage", description: "Targeted pressure massage for deep muscle relief.", priceLabel: "From KSh 4,500", priceMinor: 450000, durationLabel: "60-90 mins" },
	{ categoryKey: "massage-wellness", name: "Hot Stone Massage", description: "Warm stone therapy to ease tension and improve circulation.", priceLabel: "From KSh 5,000", priceMinor: 500000, durationLabel: "75-90 mins" },
	{ categoryKey: "massage-wellness", name: "Neck & Shoulder Massage", description: "Focused relief for upper body stiffness and posture stress.", priceLabel: "From KSh 2,500", priceMinor: 250000, durationLabel: "30-45 mins" },
	{ categoryKey: "eyebrow-lash-services", name: "Eyebrow Shaping", description: "Defined brow shaping to complement your face and style.", priceLabel: "From KSh 900", priceMinor: 90000, durationLabel: "20-30 mins" },
	{ categoryKey: "eyebrow-lash-services", name: "Eyebrow Tinting", description: "Tint enhancement for fuller, naturally defined brows.", priceLabel: "From KSh 1,200", priceMinor: 120000, durationLabel: "20-30 mins" },
	{ categoryKey: "eyebrow-lash-services", name: "Eyelash Extension", description: "Classic or volume lash extension application by experts.", priceLabel: "From KSh 2,800", priceMinor: 280000, durationLabel: "90-120 mins" },
	{ categoryKey: "eyebrow-lash-services", name: "Lash Lift", description: "Lift and curl natural lashes for a longer-looking effect.", priceLabel: "From KSh 2,200", priceMinor: 220000, durationLabel: "45-60 mins" },
	{ categoryKey: "bridal-event-packages", name: "Bridal Hair + Makeup", description: "Complete bridal glam with coordinated hair and makeup artistry.", priceLabel: "From KSh 12,000", priceMinor: 1200000, durationLabel: "3-4 hrs" },
	{ categoryKey: "bridal-event-packages", name: "Wedding Beauty Packages", description: "Custom beauty bundle packages for brides and bridal teams.", priceLabel: "From KSh 20,000", priceMinor: 2000000, durationLabel: "Half day" },
	{ categoryKey: "bridal-event-packages", name: "Graduation Package", description: "Hair, makeup, and finishing touches for graduation celebrations.", priceLabel: "From KSh 7,500", priceMinor: 750000, durationLabel: "2-3 hrs" },
	{ categoryKey: "bridal-event-packages", name: "Photoshoot Package", description: "Styled hair and makeup package tailored for photo sessions.", priceLabel: "From KSh 8,500", priceMinor: 850000, durationLabel: "2-3 hrs" },
	{ categoryKey: "cosmetics-products", name: "Nourish & Shine Hair Oil", description: "Lightweight scalp and hair oil blend for shine, moisture, and protective-style care.", priceLabel: "KSh 1,200", priceMinor: null, durationLabel: "Order via WhatsApp", orderOnly: true },
	{ categoryKey: "cosmetics-products", name: "Crown Edge Control", description: "Salon-finish edge control for smooth edges without a heavy, flaky feel.", priceLabel: "KSh 850", priceMinor: null, durationLabel: "Order via WhatsApp", orderOnly: true },
	{ categoryKey: "cosmetics-products", name: "Silk Press Heat Protectant", description: "Protective leave-in mist for heat styling, softness, and a polished finish.", priceLabel: "KSh 1,500", priceMinor: null, durationLabel: "Order via WhatsApp", orderOnly: true },
	{ categoryKey: "cosmetics-products", name: "Cocoa Glow Body Butter", description: "Rich cocoa and shea body butter for soft, supple skin after your salon visit.", priceLabel: "KSh 1,800", priceMinor: null, durationLabel: "Order via WhatsApp", orderOnly: true },
]

export function slugifyDefaultService(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

const salonAsset = (fileName: string): string => `/assets/salon/${fileName}`

export const DEFAULT_SALON_GALLERY: readonly DefaultSalonGalleryItem[] = [
	{ imageUrl: salonAsset("box-braids-hairstyles-1x1-1.jpg"), title: "Box Braids", serviceCategory: "braids-services", styleType: "Classic Box", stylistName: "Fatima Hassan", length: "Medium", size: "Medium", timeTaken: "4 hours", priceRange: "KSh 3,500 - 5,000", hairType: "18-inch synthetic blend", featuredTrending: true, featuredMostBooked: true },
	{ imageUrl: salonAsset("knotless braids.jpg"), beforeImageUrl: salonAsset("keeping box braids.jpg"), title: "Knotless Braids", serviceCategory: "braids-services", styleType: "Knotless", stylistName: "Zainab Mohamed", length: "Long", size: "Small", timeTaken: "5 hours", priceRange: "KSh 4,500 - 6,500", hairType: "22-inch human blend", featuredTrending: true },
	{ imageUrl: salonAsset("black-cornrows.webp"), title: "Cornrows Design", serviceCategory: "braids-services", styleType: "Cornrows", stylistName: "Grace Wanjiku", length: "Short", size: "Medium", timeTaken: "2 hours", priceRange: "KSh 2,000 - 3,000", hairType: "Natural hair" },
	{ imageUrl: salonAsset("fulan-braids.jpg"), title: "Fulani Braids", serviceCategory: "braids-services", styleType: "Fulani", stylistName: "Amina Diallo", length: "Long", size: "Small", timeTaken: "4 hours", priceRange: "KSh 4,000 - 5,500", hairType: "20-inch synthetic blend", featuredMostBooked: true },
	{ imageUrl: salonAsset("Senegalese_Twist.webp"), title: "Senegalese Twists", serviceCategory: "braids-services", styleType: "Twists", stylistName: "Fatima Hassan", length: "Long", size: "Medium", timeTaken: "4.5 hours", priceRange: "KSh 4,000 - 6,000", hairType: "24-inch twist fiber" },
	{ imageUrl: salonAsset("passion-twists.webp"), beforeImageUrl: salonAsset("natural hair care.webp"), title: "Passion Twists", serviceCategory: "braids-services", styleType: "Twists", stylistName: "Zainab Mohamed", length: "Medium", size: "Large", timeTaken: "3.5 hours", priceRange: "KSh 3,800 - 5,000", hairType: "Boho curl fiber" },
	{ imageUrl: salonAsset("goddess-braids.webp"), title: "Goddess Braids", serviceCategory: "braids-services", styleType: "Goddess", stylistName: "Grace Wanjiku", length: "Long", size: "Large", timeTaken: "3 hours", priceRange: "KSh 3,000 - 4,500", hairType: "20-inch fiber" },
	{ imageUrl: salonAsset("Lemonade_Braids.webp"), title: "Lemonade Braids", serviceCategory: "braids-services", styleType: "Side Cornrows", stylistName: "Amina Diallo", length: "Medium", size: "Small", timeTaken: "2.5 hours", priceRange: "KSh 2,500 - 3,800", hairType: "16-inch synthetic blend", featuredTrending: true },
	{ imageUrl: salonAsset("braiding trends.jpg"), title: "Braiding Trends", serviceCategory: "braids-services", styleType: "Creative Mix", stylistName: "Fatima Hassan", length: "Medium", size: "Medium", timeTaken: "3 hours", priceRange: "KSh 3,000 - 4,500", hairType: "Mixed extensions" },
	{ imageUrl: salonAsset("keeping box braids.jpg"), title: "Box Braids Care", serviceCategory: "hair-services", styleType: "Maintenance", stylistName: "Zainab Mohamed", length: "Medium", size: "Small", timeTaken: "1.5 hours", priceRange: "KSh 1,500 - 2,500", hairType: "Retouch service" },
	{ imageUrl: salonAsset("natural hair care.webp"), title: "Natural Hair Care", serviceCategory: "hair-services", styleType: "Protective Prep", stylistName: "Grace Wanjiku", length: "Short", size: "Medium", timeTaken: "2 hours", priceRange: "KSh 2,000 - 3,000", hairType: "Natural afro texture" },
	{ imageUrl: salonAsset("twist-braids.jpg"), title: "Twist Braids", serviceCategory: "braids-services", styleType: "Two Strand Twists", stylistName: "Amina Diallo", length: "Long", size: "Medium", timeTaken: "4 hours", priceRange: "KSh 3,500 - 5,000", hairType: "22-inch twist fiber", featuredMostBooked: true },
	{ imageUrl: salonAsset("natural hair care.webp"), title: "Nourish & Shine Hair Oil", serviceName: "Nourish & Shine Hair Oil", serviceCategory: "cosmetics-products", styleType: "Hair Care Product", stylistName: "Royal Braids Team", timeTaken: "Order via WhatsApp", priceRange: "KSh 1,200", hairType: "Scalp and hair care" },
	{ imageUrl: salonAsset("maintaining box braids.webp"), title: "Crown Edge Control", serviceName: "Crown Edge Control", serviceCategory: "cosmetics-products", styleType: "Styling Product", stylistName: "Royal Braids Team", timeTaken: "Order via WhatsApp", priceRange: "KSh 850", hairType: "Edge styling care" },
]

export const DEFAULT_SALON_REVIEWS: readonly DefaultSalonReview[] = [
	{ name: "Fatuma Ali", role: "Regular Client", text: "Fatima is the best braider in Nairobi! My knotless braids lasted 8 weeks and my edges stayed intact. Highly recommend Royal Cuts!", rating: 5, source: "Google" },
	{ name: "Amina Hassan", role: "New Client", text: "Finally found a salon that understands my hair! The box braids are neat, affordable, and the salon is so welcoming. I'm never going anywhere else!", rating: 5, source: "Instagram" },
	{ name: "Zainab Mohammed", role: "5 Years Client", text: "I've been coming to Royal Cuts for 5 years. The consistency, professionalism, and quality are unmatched. My go-to for all protective styles!", rating: 5, source: "Facebook" },
	{ name: "Grace Wanjiku", role: "Bridal Client", text: "Had my bridal braids done here and they were stunning! Lasted through my entire honeymoon. Thank you to the amazing team!", rating: 5, source: "Google" },
	{ name: "Aisha Diallo", role: "Monthly Client", text: "Grace is a natural hair expert! She always gives the best advice on maintaining my hair between appointments. Love this place!", rating: 5, source: "Instagram" },
	{ name: "Sarah Omondi", role: "Mom of 3", text: "Sarah is so patient with my daughters! The kids braiding service is excellent and my girls always leave happy. Best salon for families!", rating: 5, source: "Google" },
]

export const DEFAULT_SALON_BLOGS: readonly DefaultSalonBlog[] = [
	{ title: "How to Keep Knotless Braids Fresh for Weeks", excerpt: "Discover simple daily and nightly habits that keep your knotless braids neat, moisturized, and long-lasting.", imageUrl: salonAsset("knotless braids.jpg"), publishDate: "2026-04-16", readTime: "5 min read", readMoreUrl: "#blog" },
	{ title: "Scalp Care Tips for Protective Styles", excerpt: "Healthy braids start with a healthy scalp. Learn the products and routines our stylists recommend for itch-free comfort.", imageUrl: salonAsset("natural hair care.webp"), publishDate: "2026-03-28", readTime: "6 min read", readMoreUrl: "#blog" },
	{ title: "Top Bridal Braids for Nairobi Brides", excerpt: "From elegant up-dos to crown-inspired braid patterns, explore timeless bridal options for your big day.", imageUrl: salonAsset("goddess-braids.webp"), publishDate: "2026-03-08", readTime: "4 min read", readMoreUrl: "#blog" },
	{ title: "Before-and-After Transformations We Love", excerpt: "See how the right braid pattern, parting, and finish can transform your entire look while protecting natural hair.", imageUrl: salonAsset("box-braids-hairstyles-1x1-1.jpg"), publishDate: "2026-02-14", readTime: "5 min read", readMoreUrl: "#blog" },
	{ title: "Braids for Busy Professionals", excerpt: "Need a low-maintenance style that still looks polished? These braid options are ideal for packed work schedules.", imageUrl: salonAsset("Lemonade_Braids.webp"), publishDate: "2026-01-30", readTime: "4 min read", readMoreUrl: "#blog" },
	{ title: "Kids Braiding: Comfort-First Styling Guide", excerpt: "Our gentle approach to kids braiding keeps little ones comfortable while delivering neat and durable protective styles.", imageUrl: salonAsset("Kids-Small Single Braids after.jpg"), publishDate: "2026-01-12", readTime: "5 min read", readMoreUrl: "#blog" },
]
