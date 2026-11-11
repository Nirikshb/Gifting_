import styles from "@/components/account.module.css";

export const metadata = {
  title: "Change password",
  description: "Password for your Aapulki account.",
  robots: { index: false, follow: false },
};

export default function ChangePasswordPage() {
  return (
    <section className={styles.panel}>
      <h2>Change password</h2>
      <p>Aapulki signs you in with Google. This account has no password to change.</p>
    </section>
  );
}
