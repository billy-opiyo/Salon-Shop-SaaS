import { z } from "zod";

const runtimeConfigSchema = z.object({
  DATABASE_URL: z.string().url().refine((value) => value.includes("-pooler"), {
    message: "DATABASE_URL must use Neon's pooled -pooler host.",
  }),
  AUTH_SECRET: z.string().min(32).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
});

export function getRuntimeConfig() {
  return runtimeConfigSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  });
}
