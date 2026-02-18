/*
  Warnings:

  - You are about to drop the column `isCancelled` on the `Receipt` table. All the data in the column will be lost.

*/
-- Step 1: CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('RACUN', 'RACUN_STORNIRAN', 'STORNO');

-- Step 2: Add nullable status column
ALTER TABLE "Receipt" ADD COLUMN "status" "ReceiptStatus";

-- Step 3: Migrate existing data
-- Priority: brutto < 0 = STORNO, then check isCancelled
UPDATE "Receipt" SET "status" = 'STORNO' WHERE "brutto" < 0;
UPDATE "Receipt" SET "status" = 'RACUN_STORNIRAN' WHERE "brutto" >= 0 AND "isCancelled" = true;
UPDATE "Receipt" SET "status" = 'RACUN' WHERE "brutto" >= 0 AND "isCancelled" = false;

-- Step 4: Make status NOT NULL with default
ALTER TABLE "Receipt" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Receipt" ALTER COLUMN "status" SET DEFAULT 'RACUN';

-- Step 5: Drop old column
ALTER TABLE "Receipt" DROP COLUMN "isCancelled";
