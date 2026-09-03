-- Additive commercial-flow fields. Legacy PENDING proposals remain valid.
ALTER TABLE "Proposal" ADD COLUMN "publicToken" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "declinedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "proposalId" INTEGER;

-- pgcrypto is available on Supabase/PostgreSQL and provides CSPRNG bytes. The
-- extension declaration is idempotent; do not replace this with md5/random().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Backfill opaque bearer tokens before making the column mandatory.
UPDATE "Proposal"
SET "publicToken" = encode(gen_random_bytes(32), 'hex')
WHERE "publicToken" IS NULL;

ALTER TABLE "Proposal" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "Proposal_publicToken_key" ON "Proposal"("publicToken");
CREATE UNIQUE INDEX "Contract_proposalId_key" ON "Contract"("proposalId");
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
