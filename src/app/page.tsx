import SavingsCalculator from "@/components/SavingsCalculator";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>Prodaj ili kupi rabljeno vozilo bez upravne pristojbe</h1>
          <p>
            Kupac i prodavatelj su se već dogovorili? Mi preuzimamo dokumentaciju, ugovor i
            fiskalizirani račun kao komisionar — bez upravne pristojbe na prijepis za kupca.
          </p>
        </div>
        <SavingsCalculator />
      </main>
    </div>
  );
}
