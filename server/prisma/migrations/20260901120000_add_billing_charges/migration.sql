CREATE TYPE "BillingChargeKind" AS ENUM ('ONE_OFF');
CREATE TYPE "BillingChargeStatus" AS ENUM ('OPEN', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'REVIEW');
CREATE TABLE "BillingCharge" (
  "id" SERIAL NOT NULL, "publicId" TEXT NOT NULL, "clientId" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'BRL',
  "description" TEXT NOT NULL, "kind" "BillingChargeKind" NOT NULL DEFAULT 'ONE_OFF', "status" "BillingChargeStatus" NOT NULL DEFAULT 'OPEN',
  "externalReference" TEXT NOT NULL, "preferenceId" TEXT, "checkoutUrl" TEXT, "dueDate" TIMESTAMP(3), "paidAt" TIMESTAMP(3),
  "contractId" INTEGER, "proposalId" INTEGER, "idempotencyKey" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "BillingCharge_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentAttempt" (
  "id" SERIAL NOT NULL, "providerPaymentId" TEXT NOT NULL, "billingChargeId" INTEGER NOT NULL,
  "status" TEXT NOT NULL, "statusDetail" TEXT, "paymentMethod" TEXT, "paymentType" TEXT,
  "transactionAmount" DECIMAL(12,2), "feeAmount" DECIMAL(12,2), "approvedAt" TIMESTAMP(3), "rawPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BillingWebhookEvent" (
  "id" SERIAL NOT NULL, "providerEventId" TEXT NOT NULL, "billingChargeId" INTEGER, "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "FinancialRecord" ADD COLUMN "billingChargeId" INTEGER;
CREATE UNIQUE INDEX "BillingCharge_publicId_key" ON "BillingCharge"("publicId");
CREATE UNIQUE INDEX "BillingCharge_externalReference_key" ON "BillingCharge"("externalReference");
CREATE UNIQUE INDEX "BillingCharge_idempotencyKey_key" ON "BillingCharge"("idempotencyKey");
CREATE INDEX "BillingCharge_clientId_status_idx" ON "BillingCharge"("clientId", "status");
CREATE UNIQUE INDEX "PaymentAttempt_providerPaymentId_key" ON "PaymentAttempt"("providerPaymentId");
CREATE UNIQUE INDEX "BillingWebhookEvent_providerEventId_key" ON "BillingWebhookEvent"("providerEventId");
CREATE INDEX "FinancialRecord_billingChargeId_idx" ON "FinancialRecord"("billingChargeId");
CREATE UNIQUE INDEX "FinancialRecord_billing_income_once" ON "FinancialRecord"("billingChargeId", "type") WHERE "billingChargeId" IS NOT NULL AND "type" = 'INCOME';
CREATE UNIQUE INDEX "FinancialRecord_billing_fee_once" ON "FinancialRecord"("billingChargeId", "type", "category") WHERE "billingChargeId" IS NOT NULL AND "type" = 'EXPENSE' AND "category" = 'Mercado Pago fee';
ALTER TABLE "BillingCharge" ADD CONSTRAINT "BillingCharge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCharge" ADD CONSTRAINT "BillingCharge_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingCharge" ADD CONSTRAINT "BillingCharge_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_billingChargeId_fkey" FOREIGN KEY ("billingChargeId") REFERENCES "BillingCharge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_billingChargeId_fkey" FOREIGN KEY ("billingChargeId") REFERENCES "BillingCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialRecord" ADD CONSTRAINT "FinancialRecord_billingChargeId_fkey" FOREIGN KEY ("billingChargeId") REFERENCES "BillingCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
