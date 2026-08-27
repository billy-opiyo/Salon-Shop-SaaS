import { z } from "zod"

export const hostnameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.transform((value) => value.replace(/\.$/, ""))
	.refine((value) => value.length <= 253, "Hostname is too long.")
	.refine(
		(value) =>
			value.length > 0 &&
			!value.includes("/") &&
			!value.includes(":") &&
			!value.includes("@") &&
			!value.includes("..") &&
			/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
				value,
			),
		"Enter a valid public hostname.",
	)

export const registerDomainSchema = z.object({
	host: hostnameSchema,
})

export type RegisterDomainInput = z.infer<typeof registerDomainSchema>
