-- Add nullable gender column to User. "f" = female, "m" = male, null = unknown.
-- Captured at signup so welcome emails and other copy can address members
-- correctly (matters specifically for male members who were getting fully
-- feminine copy before this field existed).
ALTER TABLE "User" ADD COLUMN "gender" TEXT;
