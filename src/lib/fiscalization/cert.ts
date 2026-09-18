import type { FiscalCert } from "./engine";

// FINA test cert (cistest) - isti kao RENT-A-CAR app/FLEET, vidi CLAUDE.md.
// Produkcijski cert nove firme ide ovdje tek pred launch (isti env obrazac,
// samo druge vrijednosti).
export function loadFiscalCertFromEnv(): FiscalCert {
  const certBase64 = process.env.FINA_CERT_BASE64;
  const certPassword = process.env.FINA_CERT_PASSWORD;
  const oib = process.env.FINA_OIB;
  const oznPP = process.env.FINA_OZN_PP;
  const oznNU = process.env.FINA_OZN_NU;

  if (!certBase64 || !oib || !oznPP || !oznNU) {
    throw new Error("Nedostaju FINA_* env varijable za fiskalizaciju");
  }

  return { certBase64, certPassword: certPassword ?? "", oib, oznPP, oznNU };
}
