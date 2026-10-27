export interface ClientAccountSnapshot {
	readonly profile: {
		readonly name: string | null
		readonly email: string
		readonly phone: string | null
		readonly image: string | null
	}
	readonly preferences: {
		readonly theme: "dark" | "light"
		readonly fontSize: "small" | "medium" | "large"
		readonly highContrast: boolean
		readonly reducedMotion: boolean
		readonly notifyEmail: boolean
		readonly notifySms: boolean
		readonly notifyPush: boolean
	} | null
	readonly bookings: readonly {
		readonly id: string
		readonly tenantName: string
		readonly tenantSlug: string
		readonly serviceName: string
		readonly appointmentDate: string
		readonly timeLabel: string
		readonly status: string
		readonly stylistName: string | null
		readonly stylistId: string | null
		readonly specialRequests: string | null
	}[]
	readonly reviews: readonly {
		readonly id: string
		readonly tenantName: string
		readonly tenantSlug: string
		readonly serviceName: string | null
		readonly rating: number
		readonly text: string
		readonly status: string
		readonly createdAt: string
	}[]
	readonly favorites: readonly {
		readonly id: string
		readonly tenantName: string
		readonly tenantSlug: string
		readonly galleryStyleId: string
		readonly styleName: string
		readonly imageUrl: string
		readonly category: string | null
	}[]
	readonly loginHistory: readonly {
		readonly id: string
		readonly provider: string
		readonly status: string
		readonly riskLevel: string | null
		readonly userAgent: string | null
		readonly country: string | null
		readonly createdAt: string
	}[]
}
