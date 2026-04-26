-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "accessStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "membershipType" TEXT NOT NULL DEFAULT 'NONE',
    "paymentProvider" TEXT NOT NULL DEFAULT 'NONE',
    "paymentReference" TEXT,
    "paidAt" DATETIME,
    "photoUpgradeStatus" TEXT NOT NULL DEFAULT 'NONE',
    "photoUpgradeRequestedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "currentRole" TEXT,
    "targetRole" TEXT,
    "yearsExperience" INTEGER,
    "desiredField" TEXT,
    "careerTransitionGoal" TEXT,
    "mainChallenge" TEXT,
    "strengths" TEXT,
    "missingSkills" TEXT,
    "preferredSalaryMin" INTEGER,
    "preferredSalaryMax" INTEGER,
    "preferredCompanyType" TEXT,
    "linkedinUrl" TEXT,
    "resumeUrl" TEXT,
    "imageUrl" TEXT,
    "questionnaireCompleted" BOOLEAN NOT NULL DEFAULT false,
    "q_workStyle" TEXT,
    "q_teamOrSolo" TEXT,
    "q_motivators" TEXT,
    "q_biggestFear" TEXT,
    "q_idealDay" TEXT,
    "q_pastAchievement" TEXT,
    "q_learningStyle" TEXT,
    "q_shortTermGoal" TEXT,
    "q_longTermGoal" TEXT,
    "q_networkingLevel" TEXT,
    "q_salaryPriority" TEXT,
    "q_locationFlexible" BOOLEAN,
    "q_remotePreference" TEXT,
    "q_industryInterests" TEXT,
    "q_roleModels" TEXT,
    "q_valuesAtWork" TEXT,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareerPassport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "jobMatchScore" INTEGER NOT NULL DEFAULT 0,
    "strengths" TEXT,
    "skillGaps" TEXT,
    "recommendations" TEXT,
    "likelyFitRoles" TEXT,
    "recommendedIndustries" TEXT,
    "nextBestActions" TEXT,
    "summary" TEXT,
    CONSTRAINT "CareerPassport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "dateApplied" DATETIME,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "nextFollowUp" DATETIME,
    "contactName" TEXT,
    "contactLinkedin" TEXT,
    "jobLink" TEXT,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "interviewStage" TEXT,
    CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "formatType" TEXT,
    "accessType" TEXT NOT NULL DEFAULT 'INCLUDED',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "CourseContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "url" TEXT,
    "fileUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CourseContent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "type" TEXT NOT NULL DEFAULT 'LINK',
    "externalUrl" TEXT,
    "fileUrl" TEXT,
    "imageUrl" TEXT,
    "adminTip" TEXT,
    "notes" TEXT,
    "targetRole" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "companyLogo" TEXT,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "field" TEXT,
    "experienceLevel" TEXT,
    "source" TEXT,
    "externalUrl" TEXT,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'WEBINAR',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "meetingUrl" TEXT,
    "registerUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "maxCapacity" INTEGER,
    "imageUrl" TEXT
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Update" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "refId" TEXT,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeaturedCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "summary" TEXT,
    "strengths" TEXT,
    "lookingFor" TEXT,
    "imageUrl" TEXT,
    "linkedinUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "weekOf" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProgressSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "applied" INTEGER NOT NULL DEFAULT 0,
    "responses" INTEGER NOT NULL DEFAULT 0,
    "interviews" INTEGER NOT NULL DEFAULT 0,
    "offers" INTEGER NOT NULL DEFAULT 0,
    "rejections" INTEGER NOT NULL DEFAULT 0,
    "outreach" INTEGER NOT NULL DEFAULT 0,
    "networking" INTEGER NOT NULL DEFAULT 0,
    "skills" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPassport_userId_key" ON "CareerPassport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_postId_userId_key" ON "Like"("postId", "userId");
