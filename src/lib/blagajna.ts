import { prisma } from "./prisma";

// Saldo = SUM(uplata) - SUM(isplata), od početka (nema "polog"/reset akcije u
// MVP-u - vidi shema napomenu na BlagajnaUnos). Raste sporo jer uplata/isplata
// idu u paru po transakciji (vidi /api/invoices) - saldo prati akumuliranu
// nepodignutu proviziju.
export async function getBlagajnaSaldo(): Promise<number> {
  const [uplate, isplate] = await Promise.all([
    prisma.blagajnaUnos.aggregate({ where: { tip: "UPLATA" }, _sum: { iznos: true } }),
    prisma.blagajnaUnos.aggregate({ where: { tip: "ISPLATA" }, _sum: { iznos: true } }),
  ]);
  return Number(uplate._sum.iznos ?? 0) - Number(isplate._sum.iznos ?? 0);
}

export async function getDnevniMaksimumBlagajna(): Promise<number> {
  const company = await prisma.companySettings.findFirst({ orderBy: { createdAt: "desc" } });
  return company ? Number(company.dnevniMaksimumBlagajna) : 10000;
}
