import { prisma } from "@backend/db/prisma"

export const dynamic = "force-dynamic"

export async function GET(): Promise<Response> {
	try {
		await prisma.$queryRaw`SELECT 1`
		return Response.json({
			status: "ok",
			service: "salon-shop-saas",
			database: "ok",
			providers: "not-checked",
		})
	} catch {
		return Response.json(
			{
				status: "degraded",
				service: "salon-shop-saas",
				database: "unavailable",
				providers: "not-checked",
			},
			{ status: 503 },
		)
	}
}
