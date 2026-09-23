-- Preserve the Firebase booking lifecycle states and waitlist notification
-- states used by the legacy scheduled functions and triggers.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';

ALTER TYPE "WaitlistStatus" ADD VALUE IF NOT EXISTS 'NOTIFIED';
ALTER TYPE "WaitlistStatus" ADD VALUE IF NOT EXISTS 'NOTIFICATION_FAILED';

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "previousStatusBeforeAutoRelease" "BookingStatus",
  ADD COLUMN IF NOT EXISTS "bookingAutoStatus" "BookingStatus",
  ADD COLUMN IF NOT EXISTS "autoReleasedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "expiredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "noShowAt" TIMESTAMP(3);
