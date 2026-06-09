-- Add contract signature tracking
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "signatureToken" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "signedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "signedName" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "signedDocument" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Contract_signatureToken_key" ON "Contract"("signatureToken");
