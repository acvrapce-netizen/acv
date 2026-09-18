-- CreateEnum
CREATE TYPE "BlagajnaTip" AS ENUM ('UPLATA', 'ISPLATA');

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "dnevniMaksimumBlagajna" DECIMAL(12,2) NOT NULL DEFAULT 10000;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "osobnaPrednjaUrl" TEXT,
ADD COLUMN     "osobnaStraznjaUrl" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "prometnaPrednjaUrl" TEXT,
ADD COLUMN     "prometnaStraznjaUrl" TEXT;

-- CreateTable
CREATE TABLE "BlagajnaUnos" (
    "id" TEXT NOT NULL,
    "tip" "BlagajnaTip" NOT NULL,
    "iznos" DECIMAL(12,2) NOT NULL,
    "opis" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlagajnaUnos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BlagajnaUnos" ADD CONSTRAINT "BlagajnaUnos_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
