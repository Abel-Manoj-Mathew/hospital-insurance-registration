-- CreateTable
CREATE TABLE "amala" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "patientName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "yearOfBirth" INTEGER,
    "address" TEXT,
    "aadhaarNumber" TEXT,
    "dateOfAdmission" TIMESTAMP(3),
    "dateOfDischarge" TIMESTAMP(3),
    "diagnosis" TEXT,
    "packageName" TEXT,
    "estimatedCost" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amala_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "amala_sessionId_key" ON "amala"("sessionId");

-- AddForeignKey
ALTER TABLE "amala" ADD CONSTRAINT "amala_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
