import styles from "./admin.module.css";

export const TRANSACTION_STATUS_LABEL: Record<string, string> = {
  NACRT: "Nacrt",
  PODACI_UNESENI: "Čeka potpis",
  UGOVORI_POTPISANI: "Spremno za fiskalizaciju",
  RACUN_IZDAN: "Račun izdan",
  ZAVRSENO: "Završeno",
  OTKAZANO: "Otkazano",
};

export const TRANSACTION_STATUS_BADGE: Record<string, string> = {
  NACRT: styles.badgeNeutral,
  PODACI_UNESENI: styles.badgeWarn,
  UGOVORI_POTPISANI: styles.badgeWarn,
  RACUN_IZDAN: styles.badgeGood,
  ZAVRSENO: styles.badgeGood,
  OTKAZANO: styles.badgeDanger,
};
