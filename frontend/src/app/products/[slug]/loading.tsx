import styles from "./page.module.css";

export default function ProductDetailLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.backRow}>Loading product…</p>
        <div className={styles.skeleton} aria-hidden="true" />
      </div>
    </div>
  );
}
