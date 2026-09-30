-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('en', 'ml');

-- CreateEnum
CREATE TYPE "DocumentTypeId" AS ENUM ('hospitalId', 'aadhaar', 'insuranceCard', 'policyDocument', 'pan', 'labReport');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('not_uploaded', 'processing', 'accepted', 'retake_required', 'review_required', 'failed');

-- CreateEnum
CREATE TYPE "CaptureMethod" AS ENUM ('camera', 'upload');

-- CreateEnum
CREATE TYPE "BedPreferenceId" AS ENUM ('sharing', 'single', 'deluxe', 'superDeluxe');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('idle', 'submitting', 'submitted', 'failed');

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "language" "LanguageCode",
    "bedPreferencesConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "submissionStatus" "SubmissionStatus" NOT NULL DEFAULT 'idle',
    "submissionReferenceId" TEXT,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "documentType" "DocumentTypeId" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'not_uploaded',
    "captureMethod" "CaptureMethod",
    "capturedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "rejectionReasonKey" TEXT,
    "rejectionDetailKey" TEXT,
    "extractedFields" JSONB,
    "documentReference" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_preferences" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "bedType" "BedPreferenceId" NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "bed_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_sessionId_documentType_key" ON "documents"("sessionId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "bed_preferences_sessionId_bedType_key" ON "bed_preferences"("sessionId", "bedType");

-- CreateIndex
CREATE UNIQUE INDEX "bed_preferences_sessionId_rank_key" ON "bed_preferences"("sessionId", "rank");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_preferences" ADD CONSTRAINT "bed_preferences_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
