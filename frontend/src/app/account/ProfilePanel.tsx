"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import styles from "./account.module.css";

export function ProfilePanel() {
  const [profile, setProfile] = useState<{ displayName?: string; email?: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then((data) => {
        if (cancelled || !data || typeof data !== "object") return;
        setProfile(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.panel}>
      <h2>Profile</h2>
      {ready && !profile ? <p>You are not signed in.</p> : null}
      {profile ? (
        <dl className={styles.fields}>
          <div>
            <dt>Name</dt>
            <dd>{profile.displayName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
