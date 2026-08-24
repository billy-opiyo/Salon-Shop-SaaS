import { NextResponse } from "next/server";

import { WaitlistRequestError, createPublicWaitlistEntry } from "@backend/services/waitlistService";
import { waitlistRequestSchema } from "@shared/validation/booking";

export const dynamic = "force-dynamic";

function getRemoteAddress(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = waitlistRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please complete the waitlist details correctly." }, { status: 400 });

  try {
    const entry = await createPublicWaitlistEntry(parsed.data, getRemoteAddress(request));
    return NextResponse.json({ waitlistId: entry.id, queuePosition: entry.queuePosition, status: entry.status }, { status: 201 });
  } catch (error) {
    if (error instanceof WaitlistRequestError) {
      const status = error.message.startsWith("Security") ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "The waitlist request could not be created." }, { status: 500 });
  }
}
