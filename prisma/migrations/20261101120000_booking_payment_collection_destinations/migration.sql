ALTER TABLE "TenantSettings"
ADD COLUMN "bookingCollectionMethod" TEXT NOT NULL DEFAULT 'platform-stk',
ADD COLUMN "bookingCollectionNumber" TEXT;

ALTER TABLE "BookingPayment"
  ADD COLUMN "collectionMethod" TEXT NOT NULL DEFAULT 'platform-stk',
  ADD COLUMN "collectionNumber" TEXT;
