CREATE TYPE "PlatformAdminRole" AS ENUM ('STORE_EDITOR', 'STORE_SUPPORT');

CREATE TABLE "PlatformAdminRoleAssignment" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "PlatformAdminRole" NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformAdminRoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformAdminRoleAssignment_email_key"
ON "PlatformAdminRoleAssignment"("email");

CREATE INDEX "PlatformAdminRoleAssignment_role_createdAt_idx"
ON "PlatformAdminRoleAssignment"("role", "createdAt");
