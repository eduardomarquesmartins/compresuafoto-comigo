ALTER TABLE "Proposal" ADD COLUMN "paymentDay" INTEGER NOT NULL DEFAULT 25;

ALTER TABLE "Proposal"
ADD CONSTRAINT "Proposal_paymentDay_range" CHECK ("paymentDay" BETWEEN 1 AND 31);
