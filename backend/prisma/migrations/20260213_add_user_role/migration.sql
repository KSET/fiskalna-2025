-- Add missing columns to User table
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create enum type for UserRole
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'GUEST');

-- Update User table to use enum
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
