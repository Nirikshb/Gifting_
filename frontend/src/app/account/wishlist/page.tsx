import styles from "@/components/account.module.css";

export const metadata = {
  title: "Wishlist",
  description: "Your Aapulki wishlist.",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <section className={styles.panel}>
      <h2>Wishlist</h2>
      <p>You have no saved pieces.</p>
    </section>
  );
}
