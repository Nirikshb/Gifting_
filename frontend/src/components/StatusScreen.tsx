import type { ReactNode } from "react";
import styles from "./StatusScreen.module.css";

type StatusScreenProps = {
  code: string;
  title: string;
  message: string;
  action?: ReactNode;
};

export function StatusScreen({ code, title, message, action }: StatusScreenProps) {
  return (
    <section className={styles.wrap}>
      <p className={styles.code}>{code}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      {action ? <div className={styles.actions}>{action}</div> : null}
    </section>
  );
}
