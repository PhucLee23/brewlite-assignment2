-- CreateTable
CREATE TABLE "Promotion" (
    "code" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "minTotal" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("code")
);
