import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  ClientAccountError,
  getClientAccountSnapshot,
} from "@backend/services/clientAccountService";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const tenantSlug = new URL(request.url).searchParams.get("tenantSlug")?.trim() ?? "";
  if (tenantSlug.length < 3 || tenantSlug.length > 48) {
    return NextResponse.json({ error: "A valid salon store is required." }, { status: 400 });
  }

  try {
    const snapshot = await getClientAccountSnapshot(userId, tenantSlug);
    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    if (error instanceof ClientAccountError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Account data could not be loaded." }, { status: 500 });
  }
}
