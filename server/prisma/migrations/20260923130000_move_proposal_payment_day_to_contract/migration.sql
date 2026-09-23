-- Keep the legacy value readable, but prevent new proposal writes from
-- receiving a default. Payment terms now belong exclusively to Contract.
ALTER TABLE "Proposal" ALTER COLUMN "paymentDay" DROP DEFAULT;
ALTER TABLE "Proposal" ALTER COLUMN "paymentDay" DROP NOT NULL;
ALTER TABLE "Proposal" ALTER COLUMN "clientName" DROP NOT NULL;

ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "additionalScope" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "observation" TEXT;
