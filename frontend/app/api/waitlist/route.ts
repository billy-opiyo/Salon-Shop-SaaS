import { NextResponse } from "next/server";

import { auth } from "@/auth";

import { WaitlistRequestError, createPublicWaitlistEntry } from "@backend/services/waitlistService";
import { waitlistRequestSchema } from "@shared/validation/booking";
import {
	MediaProviderConfigurationError,
	MediaUploadError,
} from "@backend/services/mediaService"
import { RateLimitExceededError } from "@backend/services/rateLimit"
import { getImageUploadError, MAX_IMAGE_UPLOAD_BYTES } from "@shared/validation/media"

export const dynamic = "force-dynamic";

function getRemoteAddress(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  let inspirationFile: { readonly file: Buffer; readonly mimeType: string } | undefined
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await request.formData()
      body = Object.fromEntries(
        [...formData.entries()].filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
      const file = formData.get("inspirationImage")
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
          return NextResponse.json({ error: "The inspiration image must be 1 MB or smaller." }, { status: 413 })
        }
        const imageError = getImageUploadError(file.size, file.type)
        if (imageError) return NextResponse.json({ error: imageError }, { status: 400 })
        inspirationFile = { file: Buffer.from(await file.arrayBuffer()), mimeType: file.type }
      }
    } else {
      body = await request.json();
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = waitlistRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please complete the waitlist details correctly." }, { status: 400 });

  try {
    const session = await auth();
		const entry = await createPublicWaitlistEntry(parsed.data, getRemoteAddress(request), session?.user?.id, inspirationFile);
    return NextResponse.json({ waitlistId: entry.id, queuePosition: entry.queuePosition, status: entry.status }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) return NextResponse.json({ error: error.message }, { status: 429 });
    if (error instanceof MediaProviderConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof MediaUploadError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof WaitlistRequestError) {
      const status = error.message.startsWith("Security") ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "The waitlist request could not be created." }, { status: 500 });
  }
}
