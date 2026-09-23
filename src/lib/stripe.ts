import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

// Lijeni singleton - NE instancirati na module-load (Next.js build/route-collection
// importa ovaj modul i bez STRIPE_SECRET_KEY u .env, npr. na CI/build okolini bez
// tajni). Poziva se unutar route handlera, isti obrazac kao loadFiscalCertFromEnv().
export function getStripe(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY nije postavljen u .env");

  const client = new Stripe(key);
  if (process.env.NODE_ENV !== "production") {
    globalForStripe.stripe = client;
  }
  return client;
}
