"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getLoginUrlForPath } from "@shared/authCallback";
import { publishTenantForUser, TenantProvisioningError } from "@backend/services/tenantProvisioning";

export async function publishStore(formData: FormData): Promise<
	| { readonly ok: true; readonly message: string }
	| { readonly ok: false; readonly message: string }
> {
  const session = await auth();
	if (!session?.user?.id) redirect(getLoginUrlForPath("/account"));
  const tenantId = formData.get("tenantId");
	if (typeof tenantId !== "string" || tenantId.length === 0)
		return { ok: false, message: "Choose a salon to publish." };

  try {
    await publishTenantForUser(session.user.id, tenantId);
    revalidateTag("public-tenant-cards", { expire: 0 });
    revalidatePath("/manage");
    revalidatePath("/account");
		return { ok: true, message: "Your salon is now live." };
  } catch (error) {
		if (error instanceof TenantProvisioningError)
			return { ok: false, message: error.message };
		return {
			ok: false,
			message: "Your salon could not be published. Please try again.",
		};
  }
}
