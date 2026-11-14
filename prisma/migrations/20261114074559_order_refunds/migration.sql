-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundedAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refunds" JSONB NOT NULL DEFAULT '[]';
