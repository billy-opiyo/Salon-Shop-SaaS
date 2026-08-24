"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MerchantBookingError, updateBookingStatusForUser } from "@backend/services/merchantBookingService";
import { bookingStatusUpdateSchema } from "@shared/validation/merchant";

export async function updateBookingStatus(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const parsed = bookingStatusUpdateSchema.safeParse({ tenantSlug: formData.get("tenantSlug"), bookingId: formData.get("bookingId"), status: formData.get("status") });
  if (!parsed.success) return;
  try {
    await updateBookingStatusForUser(session.user.id, parsed.data);
    revalidatePath(`/manage/${parsed.data.tenantSlug}/bookings`);
  } catch (error) {
    if (error instanceof MerchantBookingError) return;
    return;
  }
}
