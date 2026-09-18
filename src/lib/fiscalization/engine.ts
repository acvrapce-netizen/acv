// Hrvatska fiskalizacija - CIS (Porezna uprava) SOAP + XMLDSig.
//
// Portano iz Rent-a-Car Manager projekta (packages/api/src/server/fiscalization/engine.ts),
// koji je sam portan iz FLEET-a i uskladjen s Tehničkom specifikacijom v2.7 - vidi
// tamošnje napomene za RSA-SHA256/exclusive c14n/Reference URI detalje (nepromijenjeno
// ovdje, JIR uživo potvrđen s tim postavkama).
//
// PROŠIRENO za ovaj projekt: R2-na-maržu varijanta (čl. 95. st. 2. ZOPDV-a), koju RaC
// nije trebao. Istraženo protiv službene CIS Tehničke specifikacije v2.6
// (porezna-uprava.gov.hr) + unakrsno protiv XSD sheme - vidi izracunajMarzuPdv niže za
// puno obrazloženje. NIJE isto kao "Oslobođeno" (IznosOslobPdv) - marža IMA PDV, samo
// na manju osnovicu i ne prikazan zasebno na računu.
//
// PROBNA FAZA: FINA_URL default je cistest okolina. Cert je FINA TESTNI cert (isti kao
// RaC/FLEET - vidi CLAUDE.md, produkcijski cert nove firme dolazi tek pred launch).

import crypto from "node:crypto";
import forge from "node-forge";
import https from "node:https";
import { URL } from "node:url";
import { SignedXml } from "xml-crypto";
import { DOMParser } from "@xmldom/xmldom";

const SIG_METHOD_URI = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
const DIGEST_METHOD_URI = "http://www.w3.org/2001/04/xmlenc#sha256";
const EXC_C14N_URI = "http://www.w3.org/2001/10/xml-exc-c14n#";
const ENVELOPED_URI = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";

const FINA_URL = process.env.FINA_URL ?? "https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest";

const TNS = "http://www.apis-it.hr/fin/2012/types/f73";

// ─── Pomoćne funkcije ────────────────────────────────────────────────────────

function formatIznos(iznos: number): string {
  return iznos.toFixed(2);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function hrParts(d: Date) {
  const parts = new Intl.DateTimeFormat("hr-HR", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  return (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
}

function formatDatum(d: Date): string {
  const g = hrParts(d);
  return `${g("day")}.${g("month")}.${g("year")} ${g("hour")}:${g("minute")}:${g("second")}`;
}

function formatDatumXML(d: Date): string {
  const g = hrParts(d);
  return `${g("day")}.${g("month")}.${g("year")}T${g("hour")}:${g("minute")}:${g("second")}`;
}

function generirajUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ZERO_WIDTH = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff]);
const EXOTIC_SPACE = new Set([
  0x00a0, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x202f, 0x205f,
  0x3000,
]);

function sanitizeField(s: string): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (ZERO_WIDTH.has(cp)) continue;
    out += EXOTIC_SPACE.has(cp) ? " " : ch;
  }
  return out.trim();
}

// ─── Cert ────────────────────────────────────────────────────────────────────

export interface FiscalCert {
  certBase64: string;
  certPassword: string;
  oib: string;
  oznPP: string;
  oznNU: string;
}

interface LoadedCert {
  privateKeyPem: string;
  certPem: string;
  certDerB64: string;
}

export function normalizeCert(cert: FiscalCert): FiscalCert {
  return {
    certBase64: cert.certBase64.replace(/\s+/g, ""),
    certPassword: cert.certPassword,
    oib: sanitizeField(cert.oib),
    oznPP: sanitizeField(cert.oznPP),
    oznNU: sanitizeField(cert.oznNU),
  };
}

const certCache = new Map<string, LoadedCert>();

function loadCert(rawCert: FiscalCert): LoadedCert {
  const cert = normalizeCert(rawCert);
  const cacheKey = `${cert.certBase64} ${cert.certPassword}`;
  const cached = certCache.get(cacheKey);
  if (cached) return cached;

  const pfxBytes = forge.util.decode64(cert.certBase64);
  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBytes));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, cert.certPassword);

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

  if (!keyBag?.key) throw new Error("Nije moguće učitati privatni ključ iz PFX (kriva zaporka?)");

  const keyId = (keyBag.attributes as Record<string, unknown[]>)?.localKeyId?.[0];
  const certBagsList = certBags[forge.pki.oids.certBag] ?? [];
  const certBag = keyId
    ? (certBagsList.find((b) => (b.attributes as Record<string, unknown[]>)?.localKeyId?.[0] === keyId) ??
      certBagsList[0])
    : certBagsList[0];

  if (!certBag?.cert) throw new Error("Nije moguće učitati certifikat iz PFX");

  const privateKey = keyBag.key as forge.pki.rsa.PrivateKey;
  const x509 = certBag.cert;

  const loaded: LoadedCert = {
    privateKeyPem: forge.pki.privateKeyToPem(privateKey),
    certPem: forge.pki.certificateToPem(x509),
    certDerB64: forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(x509)).bytes()).replace(/\s+/g, ""),
  };
  certCache.set(cacheKey, loaded);
  return loaded;
}

// ─── ZKI ─────────────────────────────────────────────────────────────────────

export function izracunajZKI(params: {
  oib: string;
  datum: Date;
  brOznRac: string;
  oznPP: string;
  oznNU: string;
  ukupniIznos: number;
  privateKeyPem: string;
}): string {
  const data = `${params.oib}${formatDatum(params.datum)}${params.brOznRac}${params.oznPP}${params.oznNU}${formatIznos(params.ukupniIznos)}`;
  const signatureB64 = crypto.createSign("RSA-SHA256").update(data, "utf8").sign(params.privateKeyPem, "base64");
  return crypto.createHash("md5").update(Buffer.from(signatureB64, "base64")).digest("hex");
}

// ─── Porezni blok: R2-na-maržu ───────────────────────────────────────────────
//
// Istraženo protiv CIS Tehničke specifikacije v2.6 (porezna-uprava.gov.hr) prije
// pisanja ove funkcije - NIJE pretpostavljeno. Ključni nalazi:
//
// 1. <IznosMarza> je zaseban, ČISTO INFORMATIVNI element ("Iznos na koji se odnosi
//    poseban postupak oporezivanja marže na računu") - NE ulazi u službenu formulu
//    kojom CIS provjerava IznosUkupno (Dodatak 13, šifarnik grešaka):
//      IznosUkupno = SUM(Osnovica PDV) + SUM(Iznos PDV) + Iznos PNP + Iznos oslobođenja
//                    + IznosNePodlOpor + SUM(Iznos naknada)
//    IznosMarza nije u tom zbroju.
//
// 2. Zato PDV i dalje mora ići kroz standardni <Pdv><Porez> blok, obračunat SAMO na
//    proviziju (ne na cijeli iznos) - točno formula iz spec.md: PDV = provizija × 0,20,
//    osnovica = provizija − PDV.
//
// 3. Dio iznosa koji ide prodavatelju (dogovorena cijena vozila, bez provizije) nije
//    ni PDV, ni PNP, ni oslobođenje u tehničkom smislu (VAT-exempt supply) - jedino
//    polje koje ostaje da zbroj odgovara IznosUkupno je <IznosNePodlOpor> ("iznos koji
//    ne podliježe oporezivanju"), koje CIS formula DOES uključuje.
//
// Ovo je zaključeno kombinacijom dva neovisno potvrđena službena izvora (opis polja +
// formula provjere), ne doslovan primjer "ovako se prijavljuje vozilo na marži" iz
// dokumenta - CIS spec ne daje gotov primjer za ovaj točno scenarij. Testirano uživo
// protiv cistesta (vidi scripts/), JIR dobiven prije nego je ovo ušlo u produkciju.
export interface MarzaPdvInput {
  ukupniIznos: number; // puna cijena koju plaća kupac (dogovorenaCijena + proviziaFirme)
  proviziaFirme: number; // provizija firme, PDV-uključen iznos
}

export interface MarzaPdvResult {
  pdv: PdvStavka; // PDV obračunat SAMO na proviziju
  iznosNePodlOpor: number; // dio koji ide prodavatelju, izvan dosega PDV sustava
  iznosMarza: number; // = ukupniIznos, informativno polje za Poreznu upravu
}

export function izracunajMarzuPdv(input: MarzaPdvInput): MarzaPdvResult {
  const stopa = 25;
  const iznos = round2(input.proviziaFirme * 0.2); // marža × 0,20 = PDV (spec.md, faktor za 25% "iznutra")
  const osnovica = round2(input.proviziaFirme - iznos);
  const iznosNePodlOpor = round2(input.ukupniIznos - input.proviziaFirme);

  return {
    pdv: { stopa, osnovica, iznos },
    iznosNePodlOpor,
    iznosMarza: input.ukupniIznos,
  };
}

// ─── XML generacija ──────────────────────────────────────────────────────────

const NACIN_PLAC_MAP: Record<string, string> = {
  gotovina: "G",
  kartica: "K",
  ček: "C",
  cek: "C",
  transakcijski: "T",
  "transakcijski račun": "T",
  transfer: "T",
  ostalo: "O",
};

export function nacinPlacanjaCIS(nacin: string): string {
  return NACIN_PLAC_MAP[nacin.trim().toLowerCase()] ?? "O";
}

export interface PdvStavka {
  stopa: number;
  osnovica: number;
  iznos: number;
}

// Diskriminirani tip poreznog bloka - R1 (puni PDV), R2 (oslobođeno), R2-marža.
// CLAUDE.md: za ovaj projekt treba samo marža varijanta, ali R1/R2 ostaju
// dostupni (isti kao RaC) ako se ikad pokaže potreba (npr. carVertical stavka,
// koja ide na ZASEBAN račun s punim PDV-om - vidi Invoice.type u shemi).
export type PoreznBlok =
  | { vrsta: "R1"; pdv: PdvStavka }
  | { vrsta: "R2_OSLOBODJENO" }
  | { vrsta: "R2_MARZA"; pdv: PdvStavka; iznosNePodlOpor: number; iznosMarza: number };

function generirajRacunXML(params: {
  msgId: string;
  datumVrijeme: Date;
  oib: string;
  uSustavuPdv: boolean;
  oznPP: string;
  oznNU: string;
  brOznRac: string;
  datumRacuna: Date;
  ukupniIznos: number;
  porez: PoreznBlok;
  nacinPlacanjaCode: string;
  zki: string;
}): string {
  const lines: string[] = [
    `<tns:RacunZahtjev xmlns:tns="${TNS}" Id="RacunZahtjev">`,
    `  <tns:Zaglavlje>`,
    `    <tns:IdPoruke>${params.msgId}</tns:IdPoruke>`,
    `    <tns:DatumVrijeme>${formatDatumXML(params.datumVrijeme)}</tns:DatumVrijeme>`,
    `  </tns:Zaglavlje>`,
    `  <tns:Racun>`,
    `    <tns:Oib>${params.oib}</tns:Oib>`,
    `    <tns:USustPdv>${params.uSustavuPdv ? "true" : "false"}</tns:USustPdv>`,
    `    <tns:DatVrijeme>${formatDatumXML(params.datumRacuna)}</tns:DatVrijeme>`,
    `    <tns:OznSlijed>N</tns:OznSlijed>`,
    `    <tns:BrRac>`,
    `      <tns:BrOznRac>${params.brOznRac}</tns:BrOznRac>`,
    `      <tns:OznPosPr>${params.oznPP}</tns:OznPosPr>`,
    `      <tns:OznNapUr>${params.oznNU}</tns:OznNapUr>`,
    `    </tns:BrRac>`,
  ];

  function pushPdvBlok(pdv: PdvStavka) {
    lines.push(
      `    <tns:Pdv>`,
      `      <tns:Porez>`,
      `        <tns:Stopa>${formatIznos(pdv.stopa)}</tns:Stopa>`,
      `        <tns:Osnovica>${formatIznos(pdv.osnovica)}</tns:Osnovica>`,
      `        <tns:Iznos>${formatIznos(pdv.iznos)}</tns:Iznos>`,
      `      </tns:Porez>`,
      `    </tns:Pdv>`
    );
  }

  const porez = params.porez;
  if (porez.vrsta === "R1") {
    pushPdvBlok(porez.pdv);
  } else if (porez.vrsta === "R2_OSLOBODJENO") {
    lines.push(`    <tns:IznosOslobPdv>${formatIznos(params.ukupniIznos)}</tns:IznosOslobPdv>`);
  } else {
    // R2_MARZA: standardni Pdv blok (obračunat samo na proviziju) + IznosNePodlOpor
    // (dio prodavatelju) + IznosMarza (informativno) - vidi izracunajMarzuPdv gore.
    // Shema (XSD) redoslijed: IznosOslobPdv, IznosMarza, IznosNePodlOpor, Naknade,
    // IznosUkupno - potvrđeno uživo (cistest je vratio s001 kad je redoslijed bio obrnut).
    pushPdvBlok(porez.pdv);
    lines.push(
      `    <tns:IznosMarza>${formatIznos(porez.iznosMarza)}</tns:IznosMarza>`,
      `    <tns:IznosNePodlOpor>${formatIznos(porez.iznosNePodlOpor)}</tns:IznosNePodlOpor>`
    );
  }

  lines.push(
    `    <tns:IznosUkupno>${formatIznos(params.ukupniIznos)}</tns:IznosUkupno>`,
    `    <tns:NacinPlac>${params.nacinPlacanjaCode}</tns:NacinPlac>`,
    `    <tns:OibOper>${params.oib}</tns:OibOper>`,
    `    <tns:ZastKod>${params.zki}</tns:ZastKod>`,
    `    <tns:NakDost>false</tns:NakDost>`,
    `  </tns:Racun>`,
    `</tns:RacunZahtjev>`
  );

  return lines.join("\n");
}

// ─── SOAP omotač + XMLDSig ───────────────────────────────────────────────────

function omotajUSOAP(xml: string): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">`,
    `<soapenv:Body>`,
    xml,
    `</soapenv:Body>`,
    `</soapenv:Envelope>`,
  ].join("\n");
}

function potpisSOAP(soapXml: string, privateKeyPem: string, certDerB64: string, rootId: string): string {
  const sig = new SignedXml({
    privateKey: privateKeyPem,
    canonicalizationAlgorithm: EXC_C14N_URI,
    signatureAlgorithm: SIG_METHOD_URI,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  (sig as unknown as { idAttributes: string[] }).idAttributes = ["Id"];

  sig.getKeyInfoContent = () => `<X509Data><X509Certificate>${certDerB64}</X509Certificate></X509Data>`;

  sig.addReference({
    xpath: `//*[@Id="${rootId}"]`,
    transforms: [ENVELOPED_URI, EXC_C14N_URI],
    digestAlgorithm: DIGEST_METHOD_URI,
  });

  sig.computeSignature(soapXml, {
    location: { reference: `//*[@Id="${rootId}"]`, action: "append" },
  });

  return sig.getSignedXml();
}

function verifikacijaXmlDSig(signedSoapXml: string, certPem: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(signedSoapXml, "application/xml");
    const ns = "http://www.w3.org/2000/09/xmldsig#";
    const sigNodes = doc.getElementsByTagNameNS(ns, "Signature");
    if (!sigNodes || sigNodes.length === 0) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verify = new SignedXml({ publicCert: certPem } as any);
    (verify as unknown as { idAttributes: string[] }).idAttributes = ["Id"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verify.loadSignature(sigNodes[0] as any);
    return verify.checkSignature(signedSoapXml);
  } catch {
    return false;
  }
}

// ─── HTTPS slanje ────────────────────────────────────────────────────────────

async function posaljiSOAP(soapBody: string, privateKeyPem: string, certPem: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(FINA_URL);
    const body = Buffer.from(soapBody, "utf8");
    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parseInt(parsedUrl.port) || 8449,
      path: parsedUrl.pathname,
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: '""',
        "Content-Length": body.length,
      },
      key: privateKeyPem,
      cert: certPem,
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(20_000, () => req.destroy(new Error("CIS timeout (20s)")));
    req.write(body);
    req.end();
  });
}

// ─── Parsiranje odgovora ─────────────────────────────────────────────────────

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function izvuciJIR(response: string): string | null {
  const match = response.match(/<(?:[^:>]+:)?Jir>([^<]+)<\/(?:[^:>]+:)?Jir>/);
  return match?.[1]?.trim() ?? null;
}

function izvuciGresku(response: string): string | null {
  const poruka = response.match(/<(?:[^:>]+:)?PorukaGreske>([^<]+)<\/(?:[^:>]+:)?PorukaGreske>/);
  const sifra = response.match(/<(?:[^:>]+:)?SifraGreske>([^<]+)<\/(?:[^:>]+:)?SifraGreske>/);
  if (poruka) {
    const msg = decodeXmlEntities(poruka[1]);
    return sifra ? `[${sifra[1]}] ${msg}` : msg;
  }
  const fault = response.match(/<(?:[^:>]+:)?faultstring>([^<]+)<\/(?:[^:>]+:)?faultstring>/);
  return fault?.[1]?.trim() ?? null;
}

// ─── Javni API ───────────────────────────────────────────────────────────────

export interface FiscalizeRacunInput {
  cert: FiscalCert;
  brOznRac: string;
  datumRacuna: Date;
  uSustavuPdv: boolean;
  ukupniIznos: number;
  porez: PoreznBlok;
  nacinPlacanjaCode: string;
}

export interface FiscalizeRacunResult {
  jir: string;
  zki: string;
}

/**
 * Izračuna ZKI bez slanja išta CIS-u. ZKI se mora znati PRIJE nego se broj
 * računa "potroši" - Invoice red se kreira sa ZKI-jem i zadrži broj čak i ako
 * fiskalizacija padne, bez rupa u nizu.
 */
export function computeZki(
  rawCert: FiscalCert,
  params: { brOznRac: string; datumRacuna: Date; ukupniIznos: number }
): string {
  const cert = normalizeCert(rawCert);
  const { privateKeyPem } = loadCert(cert);
  return izracunajZKI({
    oib: cert.oib,
    datum: params.datumRacuna,
    brOznRac: sanitizeField(params.brOznRac),
    oznPP: cert.oznPP,
    oznNU: cert.oznNU,
    ukupniIznos: params.ukupniIznos,
    privateKeyPem,
  });
}

// QR kod format potvrđen u CLAUDE.md - eurocenti kao cijeli broj, datum bez
// separatora (GGGGMMDD_HHMM).
export function buildFiscalQrUrl(jir: string, datumRacuna: Date, ukupniIznos: number): string {
  const g = hrParts(datumRacuna);
  const datv = `${g("year")}${g("month")}${g("day")}_${g("hour")}${g("minute")}`;
  const izn = Math.round(ukupniIznos * 100);
  return `https://porezna.gov.hr/rn?jir=${jir}&datv=${datv}&izn=${izn}`;
}

/** Fiskalizira jedan račun kod CIS-a. Baca Error s CIS porukom ako padne. */
export async function fiscalizeRacun(input: FiscalizeRacunInput & { zki?: string }): Promise<FiscalizeRacunResult> {
  const cert = normalizeCert(input.cert);
  const { privateKeyPem, certPem, certDerB64 } = loadCert(cert);

  const brOznRac = sanitizeField(input.brOznRac);
  const zki =
    input.zki ??
    izracunajZKI({
      oib: cert.oib,
      datum: input.datumRacuna,
      brOznRac,
      oznPP: cert.oznPP,
      oznNU: cert.oznNU,
      ukupniIznos: input.ukupniIznos,
      privateKeyPem,
    });

  const xml = generirajRacunXML({
    msgId: generirajUUID(),
    datumVrijeme: new Date(),
    oib: cert.oib,
    uSustavuPdv: input.uSustavuPdv,
    oznPP: cert.oznPP,
    oznNU: cert.oznNU,
    brOznRac,
    datumRacuna: input.datumRacuna,
    ukupniIznos: input.ukupniIznos,
    porez: input.porez,
    nacinPlacanjaCode: sanitizeField(input.nacinPlacanjaCode),
    zki,
  });

  const soapPotpisan = potpisSOAP(omotajUSOAP(xml), privateKeyPem, certDerB64, "RacunZahtjev");
  if (!verifikacijaXmlDSig(soapPotpisan, certPem)) {
    console.warn("[Fisk] lokalna XMLDSig verifikacija nije prošla - šaljem svejedno");
  }

  const response = await posaljiSOAP(soapPotpisan, privateKeyPem, certPem);

  const greska = izvuciGresku(response);
  if (greska) throw new Error(`CIS greška: ${greska}`);

  const jir = izvuciJIR(response);
  if (!jir) throw new Error("JIR nije pronađen u odgovoru CIS-a");

  return { jir, zki };
}
