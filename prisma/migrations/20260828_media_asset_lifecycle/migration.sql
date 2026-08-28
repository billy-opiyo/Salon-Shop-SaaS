-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('PENDING', 'READY');

-- Add lifecycle fields. Existing rows are already uploaded and therefore ready.
ALTER TABLE "MediaAsset"
ADD COLUMN "status" "MediaAssetStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN "pendingExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "MediaAsset_status_pendingExpiresAt_idx" ON "MediaAsset"("status", "pendingExpiresAt");
