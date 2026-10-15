import { NextResponse } from "next/server";

import { auth } from "@/auth";

import {
	BookingRequestError,
	BookingSlotUnavailableError,
	createPublicBooking,
} from "@backend/services/bookingService";
import {
	BookingPaymentError,
	requestBookingPayment,
} from "@backend/services/bookingPaymentService"
import { bookingRequestSchema } from "@shared/validation/booking";
import { getImageUploadError, MAX_IMAGE_UPLOAD_BYTES } from "@shared/validation/media"
import {
	MediaProviderConfigurationError,
	MediaUploadError,
} from "@backend/services/mediaService"

export const dynamic = "force-dynamic";

function getRemoteAddress(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
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

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete the booking details correctly." }, { status: 400 });
  }

	try {
		const session = await auth();
		const booking = await createPublicBooking(parsed.data, getRemoteAddress(request), session?.user?.id, inspirationFile);
		let payment: { readonly status: string; readonly paymentId: string } | undefined
		if (booking.payment?.status === "pending") {
			try {
				payment = await requestBookingPayment(
					parsed.data.tenantSlug,
					booking.payment.id,
					parsed.data.phone,
				)
			} catch (error) {
				if (error instanceof BookingPaymentError)
					return NextResponse.json(
						{
							error: error.message,
							bookingId: booking.id,
							paymentId: booking.payment.id,
						},
						{ status: 502 },
					)
				throw error
			}
		}
		return NextResponse.json(
			{
				bookingId: booking.id,
				status: booking.status,
				payment: booking.payment
					? {
							...booking.payment,
							status: payment?.status ?? booking.payment.status,
							paymentId: payment?.paymentId ?? booking.payment.id,
						}
					: null,
			},
			{ status: 201 },
		);
	} catch (error) {
		if (error instanceof MediaProviderConfigurationError) {
			return NextResponse.json({ error: error.message }, { status: 503 })
		}
		if (error instanceof MediaUploadError) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
    if (error instanceof BookingSlotUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof BookingRequestError) {
      const status = error.message.startsWith("Security") ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "The booking could not be created." }, { status: 500 });
  }
}
