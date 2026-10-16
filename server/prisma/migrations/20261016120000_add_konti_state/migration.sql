CREATE TABLE "KontiState" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KontiState_pkey" PRIMARY KEY ("key")
);
