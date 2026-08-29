-- Allow an event gallery to be restricted to one registered customer.
ALTER TABLE "Event"
ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "authorizedUserId" INTEGER;

CREATE INDEX "Event_visibility_idx" ON "Event"("visibility");
CREATE INDEX "Event_authorizedUserId_idx" ON "Event"("authorizedUserId");

ALTER TABLE "Event"
ADD CONSTRAINT "Event_authorizedUserId_fkey"
FOREIGN KEY ("authorizedUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
