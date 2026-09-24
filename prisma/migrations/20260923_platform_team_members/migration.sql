CREATE TABLE "PlatformTeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "avatarObjectKey" TEXT,
    "websiteUrl" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "xUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformTeamMember_published_displayOrder_createdAt_idx"
  ON "PlatformTeamMember"("published", "displayOrder", "createdAt");

CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformAuditLog_actorUserId_createdAt_idx"
  ON "PlatformAuditLog"("actorUserId", "createdAt");
CREATE INDEX "PlatformAuditLog_resourceType_resourceId_createdAt_idx"
  ON "PlatformAuditLog"("resourceType", "resourceId", "createdAt");

ALTER TABLE "PlatformAuditLog"
  ADD CONSTRAINT "PlatformAuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
