ALTER TABLE "TenantSettings"
  ADD COLUMN "bookingPaymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bookingPaymentModes" JSONB,
  ADD COLUMN "bookingDepositPercent" INTEGER NOT NULL DEFAULT 50;

ALTER TABLE "Service"
  ADD COLUMN "priceMinor" INTEGER;

CREATE TABLE "BookingPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "paymentMode" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "serviceTotalMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "phoneNumber" TEXT,
  "merchantRequestId" TEXT,
  "checkoutRequestId" TEXT,
  "mpesaReceiptNumber" TEXT,
  "resultDescription" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "rawCallback" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingPayment_checkoutRequestId_key"
  ON "BookingPayment"("checkoutRequestId");
CREATE INDEX "BookingPayment_tenantId_status_createdAt_idx"
  ON "BookingPayment"("tenantId", "status", "createdAt");
CREATE INDEX "BookingPayment_bookingId_status_idx"
  ON "BookingPayment"("bookingId", "status");
CREATE INDEX "BookingPayment_merchantRequestId_idx"
  ON "BookingPayment"("merchantRequestId");

ALTER TABLE "BookingPayment"
  ADD CONSTRAINT "BookingPayment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingPayment"
  ADD CONSTRAINT "BookingPayment_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
