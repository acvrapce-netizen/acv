-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "proviziaPlacenaAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripeCheckoutSessionId_key" ON "Transaction"("stripeCheckoutSessionId");
