import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@backend/db/prisma";

export class RateLimitExceededError extends Error {
  readonly code = "RATE_LIMITED" as const;

  constructor(message = "Too many requests. Please try again shortly.") {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

export function hashRateLimitSubject(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function consumeRateLimit({
  tenantId,
  subjectKey,
  kind,
  intervalMs,
}: {
  readonly tenantId?: string;
  readonly subjectKey: string;
  readonly kind: string;
  readonly intervalMs: number;
}): Promise<void> {
  const now = new Date();
  const availableAt = new Date(now.getTime() + intervalMs);

  try {
    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.rateLimitRecord.findUnique({
        where: { tenantId_subjectKey_kind: { tenantId: tenantId ?? null, subjectKey, kind } },
        select: { id: true, availableAt: true },
      });

      if (existing?.availableAt && existing.availableAt > now) {
        throw new RateLimitExceededError();
      }

      if (!existing) {
        await transaction.rateLimitRecord.create({ data: { tenantId, subjectKey, kind, availableAt } });
        return;
      }

      const updated = await transaction.rateLimitRecord.updateMany({
        where: { id: existing.id, availableAt: { lte: now } },
        data: { availableAt },
      });
      if (updated.count !== 1) throw new RateLimitExceededError();
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new RateLimitExceededError();
    }
    throw error;
  }
}
