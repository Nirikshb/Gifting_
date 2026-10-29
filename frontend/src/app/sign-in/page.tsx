import { GoogleSignInEntry } from "./GoogleSignIn";
import styles from "./page.module.css";

export const metadata = {
  title: "Sign in | Gift Packaging",
  description: "Sign in with your Google account.",
};

export default function SignInPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <GoogleSignInEntry />
      </div>
    </div>
  );
}
