-- CreateEnum
CREATE TYPE "RelationToPatient" AS ENUM ('self', 'spouse', 'parent', 'child', 'sibling', 'relative', 'other');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactRelation" "RelationToPatient";
