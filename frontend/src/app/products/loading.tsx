import styles from "./page.module.css";

export default function ProductsLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <h1>Gift packaging</h1>
          <p>Loading the catalogue…</p>
        </header>
        <div className={styles.skeletonGrid} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    </div>
  );
}
