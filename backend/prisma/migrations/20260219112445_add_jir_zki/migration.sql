-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "jir" TEXT,
ADD COLUMN     "zki" TEXT,
ALTER COLUMN "receiptNumber" DROP NOT NULL;
