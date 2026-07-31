-- Serviços disponíveis para cada tipo de colaborador e lançamentos realizados.
CREATE TABLE "ServiceDefinition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceCompletion" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "collaboratorId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitValue" DOUBLE PRECISION NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCompletion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceCompletion_collaboratorId_paymentStatus_idx" ON "ServiceCompletion"("collaboratorId", "paymentStatus");
CREATE INDEX "ServiceCompletion_serviceId_idx" ON "ServiceCompletion"("serviceId");
ALTER TABLE "ServiceCompletion" ADD CONSTRAINT "ServiceCompletion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceCompletion" ADD CONSTRAINT "ServiceCompletion_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
