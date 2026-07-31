ALTER TABLE "ServiceDefinition" ADD COLUMN "collaboratorId" INTEGER;
CREATE INDEX "ServiceDefinition_collaboratorId_idx" ON "ServiceDefinition"("collaboratorId");
ALTER TABLE "ServiceDefinition" ADD CONSTRAINT "ServiceDefinition_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
