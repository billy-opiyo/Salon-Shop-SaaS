CREATE TABLE "PlatformStorefrontConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "logoUrl" TEXT,
    "heroDesktopUrl" TEXT,
    "heroMobileUrl" TEXT,
    "heroAlt" TEXT,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformStorefrontConfig_pkey" PRIMARY KEY ("id")
);
