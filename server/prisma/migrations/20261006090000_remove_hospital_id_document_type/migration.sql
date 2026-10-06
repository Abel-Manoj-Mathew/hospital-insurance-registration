-- Hospital ID has been removed from the approved document workflow.
-- Postgres cannot drop a single enum value, so rows using it are deleted and the enum is recreated.
BEGIN;
DELETE FROM "documents" WHERE "documentType" = 'hospitalId';
CREATE TYPE "DocumentTypeId_new" AS ENUM ('aadhaar', 'insuranceCard', 'policyDocument', 'labReport');
ALTER TABLE "documents" ALTER COLUMN "documentType" TYPE "DocumentTypeId_new" USING ("documentType"::text::"DocumentTypeId_new");
ALTER TYPE "DocumentTypeId" RENAME TO "DocumentTypeId_old";
ALTER TYPE "DocumentTypeId_new" RENAME TO "DocumentTypeId";
DROP TYPE "DocumentTypeId_old";
COMMIT;
