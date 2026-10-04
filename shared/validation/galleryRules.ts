export interface HairGalleryFieldRules {
	readonly showTechnique: true
	readonly requireTechnique: true
	readonly showLengthDensity: true
	readonly showProductsUsed: boolean
	readonly requireProductsUsed: boolean
}

/** Keeps the legacy gallery category-specific hair fields consistent on both
 * the admin form and the server-side mutation validator. */
export function getHairGalleryFieldRules(
	hairServiceType: string | undefined,
): HairGalleryFieldRules {
	const normalizedType = hairServiceType?.trim().toLowerCase() ?? ""
	const isHairCutting = normalizedType === "hair cutting"
	const requiresProductsUsed =
		normalizedType === "hair coloring" ||
		normalizedType === "hair relaxing" ||
		normalizedType === "hair treatment"

	return {
		showTechnique: true,
		requireTechnique: true,
		showLengthDensity: true,
		showProductsUsed: !isHairCutting,
		requireProductsUsed: requiresProductsUsed,
	}
}
