// Debug skripta — provjerava da runtime konekcija (pooler, DATABASE_URL) stvarno
// radi upis/čitanje, ne samo migracija (koja ide preko DIRECT_URL).
// Pokreni: npm run db:smoke-test

import { prisma } from "../src/lib/prisma.ts";

async function main() {
  const testOib = "SMOKE-TEST-" + Date.now();

  const created = await prisma.person.create({
    data: {
      ime: "Smoke",
      prezime: "Test",
      oib: testOib,
      adresa: "Testna 1",
      grad: "Zagreb",
      email: "smoke-test@example.com",
      telefon: "0000000000",
    },
  });
  console.log("CREATED:", created.id, created.oib);

  const read = await prisma.person.findUnique({ where: { id: created.id } });
  console.log("READ BACK:", read?.id, read?.oib, read?.ime, read?.prezime);

  await prisma.person.delete({ where: { id: created.id } });
  console.log("CLEANED UP: deleted", created.id);

  await prisma.$disconnect();
  console.log("OK: pooler runtime connection radi (write + read + delete).");
}

main().catch(async (err) => {
  console.error("SMOKE TEST FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
