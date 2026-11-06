import styles from "../account.module.css";

export const metadata = {
  title: "Saved address",
  description: "Your saved Aapulki address.",
};

export default function SavedAddressPage() {
  return (
    <section className={styles.panel}>
      <h2>Saved address</h2>
      <p>You have no saved address.</p>
    </section>
  );
}
