-- CreateEnum
CREATE TYPE "NacinPlacanja" AS ENUM ('GOTOVINA', 'CESIJA');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('NACRT', 'PODACI_UNESENI', 'UGOVORI_POTPISANI', 'RACUN_IZDAN', 'ZAVRSENO', 'OTKAZANO');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('KOMISIJA', 'PRIHVAT_RACUNA');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('NA_CEKANJU', 'POTPISANO', 'ODBIJENO');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('VOZILO_MARZA', 'CARVERTICAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('NACRT', 'FISKALIZIRANO', 'STORNIRANO');

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "adresa" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "mbs" TEXT,
    "euid" TEXT,
    "temeljniKapital" DECIMAL(12,2),
    "direktor" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "ime" TEXT NOT NULL,
    "prezime" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "adresa" TEXT NOT NULL,
    "grad" TEXT NOT NULL,
    "drzava" TEXT NOT NULL DEFAULT 'Hrvatska',
    "email" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vlasnikId" TEXT NOT NULL,
    "vrstaVozila" TEXT NOT NULL,
    "marka" TEXT NOT NULL,
    "tip" TEXT,
    "model" TEXT,
    "sasija" TEXT NOT NULL,
    "registarskaOznaka" TEXT,
    "uPrometuOd" TIMESTAMP(3),
    "godinaProizvodnje" INTEGER NOT NULL,
    "obujamCm3" INTEGER,
    "snagaKw" INTEGER,
    "boja" TEXT,
    "brojSjedala" INTEGER,
    "oblik" TEXT,
    "vrstaMotora" TEXT,
    "kilometraza" INTEGER,
    "nosivost" INTEGER,
    "coEmisija" INTEGER,
    "zemljaPorijekla" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "prodavateljId" TEXT NOT NULL,
    "kupacId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "dogovorenaCijena" DECIMAL(12,2) NOT NULL,
    "proviziaFirme" DECIMAL(12,2) NOT NULL,
    "nacinPlacanja" "NacinPlacanja" NOT NULL DEFAULT 'GOTOVINA',
    "status" "TransactionStatus" NOT NULL DEFAULT 'NACRT',
    "carVerticalOdabran" BOOLEAN NOT NULL DEFAULT false,
    "carVerticalCijena" DECIMAL(12,2),
    "garancijaZatrazena" BOOLEAN NOT NULL DEFAULT false,
    "garancijaZatrazenaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "signerId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'NA_CEKANJU',
    "signingToken" TEXT NOT NULL,
    "potpisanoAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'NACRT',
    "brojRacuna" TEXT,
    "poslovniProstorOznaka" TEXT,
    "naplatniUredajOznaka" TEXT,
    "ukupanIznos" DECIMAL(12,2) NOT NULL,
    "pdvIznos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "jir" TEXT,
    "zki" TEXT,
    "qrKodPodaci" TEXT,
    "izdanoAt" TIMESTAMP(3),
    "rokPlacanja" TIMESTAMP(3),
    "napomena" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "opis" TEXT NOT NULL,
    "kolicina" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "jedinicnaCijena" DECIMAL(12,2) NOT NULL,
    "rabatPostotak" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "iznos" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_sasija_key" ON "Vehicle"("sasija");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_signingToken_key" ON "Contract"("signingToken");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_transactionId_type_key" ON "Contract"("transactionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_jir_key" ON "Invoice"("jir");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_zki_key" ON "Invoice"("zki");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vlasnikId_fkey" FOREIGN KEY ("vlasnikId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_prodavateljId_fkey" FOREIGN KEY ("prodavateljId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_kupacId_fkey" FOREIGN KEY ("kupacId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
