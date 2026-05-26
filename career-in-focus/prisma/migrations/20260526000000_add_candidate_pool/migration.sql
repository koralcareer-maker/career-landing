-- Candidate pool for the auto-matcher. Populated from Canva CVs (~400),
-- Gmail attachments, WhatsApp files, and the upcoming public lead form.
-- Embedding column stays null until backfilled by the AI extractor.
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "targetRole" TEXT,
    "field" TEXT,
    "region" TEXT,
    "city" TEXT,
    "yearsExperience" INTEGER,
    "currentCompany" TEXT,
    "currentTitle" TEXT,
    "summary" TEXT,
    "skills" TEXT,
    "languages" TEXT,
    "education" TEXT,
    "militaryUnit" TEXT,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "cvUrl" TEXT,
    "rawCvText" TEXT,
    "embedding" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "handledByCoral" BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX "Candidate_field_region_idx" ON "Candidate"("field", "region");
CREATE INDEX "Candidate_source_sourceRef_idx" ON "Candidate"("source", "sourceRef");
CREATE INDEX "Candidate_handledByCoral_createdAt_idx" ON "Candidate"("handledByCoral", "createdAt");
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");
