"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { publishTenantForUser, TenantProvisioningError } from "@backend/services/tenantProvisioning";

export async function publishStore(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const tenantId = formData.get("tenantId");
  if (typeof tenantId !== "string" || tenantId.length === 0) return;

  try {
    await publishTenantForUser(session.user.id, tenantId);
    revalidatePath("/manage");
  } catch (error) {
    if (error instanceof TenantProvisioningError) return;
    return;
  }
}
