"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  getEmailStats,
  getProviderStatus,
  listEmailActivity,
  listEmailSettings,
  sendTestEmail,
  updateEmailSetting,
  type EmailActivityItem,
  type EmailSetting,
  type ProviderStatus,
} from "@/lib/api/email";
import styles from "./admin.module.css";

type LoadState = "loading" | "ready" | "error";
type StatusFilter = string | "all";
type EventTypeFilter = string | "all";

const PAGE_SIZE = 25;

const SETTING_LABELS: Record<string, string> = {
  order_confirmation: "Order confirmation",
  payment_confirmation: "Payment confirmation",
  order_status_updates: "Order status updates",
  cancellation_confirmation: "Cancellation confirmation",
  admin_new_order: "New order (studio)",
};

const SETTING_DESCRIPTIONS: Record<string, string> = {
  order_confirmation:
    "Sent to the customer when an order is placed. Independent of the studio notification.",
  payment_confirmation:
    "Sent to the customer once a verified payment is recorded. Disabled until a verified payment event source is wired up.",
  order_status_updates:
    "Sent to the customer when fulfilment status changes (confirmed, processing, shipped, delivered).",
  cancellation_confirmation:
    "Sent to the customer when an order is cancelled. Controlled independently of other status updates.",
  admin_new_order:
    "Sent to the studio when a new order is placed. Independent of the customer order-confirmation switch.",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  order_placed: "Order placed",
  admin_new_order: "New order (studio)",
  order_status_changed: "Order status changed",
  newsletter_confirmation: "Newsletter confirmation",
  payment_confirmed: "Payment confirmed",
};

export function AdminEmailView() {
  const [state, setState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  // Overview
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(
    null,
  );
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    sending: number;
    sent: number;
    failed: number;
    lastSuccessfulDelivery: string | null;
  } | null>(null);

  // Settings
  const [settings, setSettings] = useState<EmailSetting[]>([]);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  // Activity
  const [activityState, setActivityState] = useState<LoadState>("loading");
  const [activities, setActivities] = useState<EmailActivityItem[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] =
    useState<EventTypeFilter>("all");
  const [recipientFilter, setRecipientFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [activityReloadKey, setActivityReloadKey] = useState(0);

  // Test email
  const [testRecipient, setTestRecipient] = useState("");
  const [testState, setTestState] = useState<
    "idle" | "sending" | "done" | "error"
  >("idle");
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getProviderStatus(), getEmailStats(), listEmailSettings()])
      .then(([provider, statsData, settingsData]) => {
        if (cancelled) return;
        setProviderStatus(provider);
        setStats(statsData);
        setSettings(settingsData);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;

    listEmailActivity({
      page: activityPage,
      limit: PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
      eventType: eventTypeFilter === "all" ? undefined : eventTypeFilter,
      recipient: recipientFilter || undefined,
      from: fromFilter || undefined,
      to: toFilter || undefined,
      search: searchFilter || undefined,
    })
      .then((result) => {
        if (cancelled) return;
        setActivities(result.items);
        setPagination(result.pagination);
        setActivityState("ready");
      })
      .catch(() => {
        if (!cancelled) setActivityState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [
    activityPage,
    statusFilter,
    eventTypeFilter,
    recipientFilter,
    fromFilter,
    toFilter,
    searchFilter,
    activityReloadKey,
  ]);

  async function toggleSetting(key: string, enabled: boolean) {
    setToggling((prev) => new Set([...prev, key]));
    try {
      await updateEmailSetting(key as any, enabled);
      setSettings((current) =>
        current.map((s) => (s.key === key ? { ...s, enabled } : s)),
      );
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  function clearFilters() {
    setStatusFilter("all");
    setEventTypeFilter("all");
    setRecipientFilter("");
    setFromFilter("");
    setToFilter("");
    setSearchFilter("");
    setActivityPage(1);
    setActivityState("loading");
    setActivityReloadKey((k) => k + 1);
  }

  async function handleTestEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!testRecipient || testState === "sending") return;

    setTestState("sending");
    setTestError(null);

    try {
      await sendTestEmail(testRecipient);
      setTestState("done");
    } catch (error: any) {
      setTestState("error");
      setTestError(
        error?.message ?? "We could not send the test email. Try again later.",
      );
    } finally {
      if (testState !== "done") {
        setTestState("idle");
      }
    }
  }

  if (state === "loading") {
    return (
      <div className={styles.page}>
        <div className={styles.panelSkeleton} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={styles.page}>
        <div className={styles.emptyBlock}>
          <p className={styles.emptyTitle}>We could not load email settings</p>
          <p className={styles.emptyText}>
            The studio API did not respond. Check the connection and try again.
          </p>
          <button
            className={styles.retry}
            type="button"
            onClick={() => {
              setState("loading");
              setReloadKey((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <p className={styles.eyebrow}>Studio</p>
          <h1 className={styles.pageTitle}>Email management</h1>
          <p className={styles.pageSub}>
            Control transactional email types, review delivery history, check
            provider status and send test emails.
          </p>
        </div>
        <Link className={styles.actionButton} href="/admin">
          Back to overview
        </Link>
      </header>

      {/* A. Overview */}
      <section className={styles.panel} aria-label="Email overview">
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Overview</h2>
            <p className={styles.panelSub}>
              Provider status and delivery figures at a glance.
            </p>
          </div>
        </div>

        <div className={styles.statGrid}>
          <StatCard
            label="Provider"
            value={
              providerStatus?.configured
                ? providerStatus.provider
                : "Not configured"
            }
            hint={providerStatus?.configHold ?? "Provider status unknown"}
          />
          <StatCard
            label="Total sent"
            value={String(stats?.total ?? 0)}
            hint="All outbox records"
          />
          <StatCard
            label="Pending"
            value={String(stats?.pending ?? 0)}
            hint="Awaiting delivery"
          />
          <StatCard
            label="Failed"
            value={String(stats?.failed ?? 0)}
            hint="Delivery failed after retries"
          />
          <StatCard
            label="Last delivery"
            value={
              stats?.lastSuccessfulDelivery
                ? new Date(stats.lastSuccessfulDelivery).toLocaleString()
                : "—"
            }
            hint="Most recent successful send"
          />
        </div>

        {providerStatus && providerStatus.configHold && (
          <div className={styles.noticeDanger}>{providerStatus.configHold}</div>
        )}
      </section>

      {/* B. Transactional settings */}
      <section
        className={styles.panel}
        aria-label="Transactional email settings"
      >
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Transactional settings</h2>
            <p className={styles.panelSub}>
              Each switch controls one category of transactional email. Changes
              take effect immediately and persist across restarts.
            </p>
          </div>
        </div>

        <div className={styles.formGrid}>
          {settings.map((setting) => (
            <div key={setting.key} className={styles.field}>
              <label className={styles.fieldLabel}>
                {SETTING_LABELS[setting.key] ?? setting.key}
              </label>
              <input
                type="checkbox"
                checked={setting.enabled}
                onChange={(event) => {
                  toggleSetting(setting.key, event.target.checked);
                }}
                disabled={toggling.has(setting.key)}
                aria-label={`Toggle ${SETTING_LABELS[setting.key] ?? setting.key}`}
              />
              <p className={styles.fieldHint}>
                {SETTING_DESCRIPTIONS[setting.key] ?? setting.description}
              </p>
              {setting.key === "payment_confirmation" && !setting.enabled && (
                <span className={styles.inputError}>
                  Not yet operational — no verified payment event source is
                  connected.
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* C. Activity history */}
      <section className={styles.panel} aria-label="Email activity history">
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Activity history</h2>
            <p className={styles.panelSub}>
              Every transactional email queued by the system, with delivery
              status and failures.
            </p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <form
            className={styles.searchForm}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setActivityPage(1);
              setActivityState("loading");
              setActivityReloadKey((k) => k + 1);
            }}
          >
            <input
              className={styles.searchInput}
              type="search"
              value={searchFilter}
              placeholder="Search reference, recipient or subject"
              aria-label="Search email activity"
              onChange={(event) => setSearchFilter(event.target.value)}
            />
            <button className={styles.searchButton} type="submit">
              Search
            </button>
          </form>

          <label className={styles.selectLabel}>
            <span>Status</span>
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setActivityPage(1);
                setActivityState("loading");
                setActivityReloadKey((k) => k + 1);
              }}
            >
              <option value="all">All statuses</option>
              {["pending", "sending", "sent", "failed"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.selectLabel}>
            <span>Event type</span>
            <select
              className={styles.select}
              value={eventTypeFilter}
              onChange={(event) => {
                setEventTypeFilter(event.target.value as EventTypeFilter);
                setActivityPage(1);
                setActivityState("loading");
                setActivityReloadKey((k) => k + 1);
              }}
            >
              <option value="all">All event types</option>
              {[
                "order_placed",
                "admin_new_order",
                "order_status_changed",
                "newsletter_confirmation",
                "payment_confirmed",
              ].map((value) => (
                <option key={value} value={value}>
                  {EVENT_TYPE_LABELS[value] ?? value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label className={styles.fieldLabel}>Recipient contains</label>
          <input
            className={styles.input}
            type="email"
            value={recipientFilter}
            placeholder="alice@example.com"
            aria-label="Filter by recipient"
            onChange={(event) => setRecipientFilter(event.target.value)}
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>From</label>
            <input
              className={styles.input}
              type="date"
              value={fromFilter}
              aria-label="From date"
              onChange={(event) => setFromFilter(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>To</label>
            <input
              className={styles.input}
              type="date"
              value={toFilter}
              aria-label="To date"
              onChange={(event) => setToFilter(event.target.value)}
            />
          </div>
        </div>

        <button
          className={styles.ghostButton}
          type="button"
          onClick={clearFilters}
        >
          Clear filters
        </button>

        {activityState === "loading" ? (
          <div className={styles.tableWrap}>
            <div className={styles.panelSkeleton} />
          </div>
        ) : null}

        {activityState === "error" ? (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyTitle}>We could not load activity</p>
            <p className={styles.emptyText}>
              The studio API did not respond. Check the connection and try
              again.
            </p>
            <button
              className={styles.retry}
              type="button"
              onClick={() => {
                setActivityState("loading");
                setActivityReloadKey((k) => k + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : null}

        {activityState === "ready" && activities.length === 0 && (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyTitle}>No email activity</p>
            <p className={styles.emptyText}>
              No transactional emails match these filters.
            </p>
            <button
              className={styles.retry}
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}

        {activityState === "ready" && activities.length > 0 && (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Order</th>
                    <th scope="col">Recipient</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Status</th>
                    <th scope="col" className={styles.alignRight}>
                      Attempts
                    </th>
                    <th scope="col">Created</th>
                    <th scope="col">Sent</th>
                    <th scope="col">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {EVENT_TYPE_LABELS[row.eventType] ?? row.eventType}
                        <br />
                        <span className={styles.muted}>{row.eventKey}</span>
                      </td>
                      <td>
                        {row.orderReference ?? (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td className={styles.muted}>{row.recipientEmail}</td>
                      <td className={styles.muted}>{row.subject}</td>
                      <td>
                        <span
                          className={
                            styles.pill +
                            " " +
                            (row.status === "sent"
                              ? styles.pillActive
                              : styles.pillInactive)
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className={styles.alignRight}>{row.attempts}</td>
                      <td className={styles.muted}>
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className={styles.muted}>
                        {row.sentAt
                          ? new Date(row.sentAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className={styles.muted}>
                        {row.lastError ? (
                          <span className={styles.inputError}>
                            {row.lastError}
                          </span>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.tableFooter}>
              <p className={styles.footerMeta}>
                {pagination
                  ? `Showing ${activities.length} of ${pagination.total} ${
                      pagination.total === 1 ? "email" : "emails"
                    }`
                  : "\u00a0"}
              </p>
              {pagination && pagination.totalPages > 1 ? (
                <nav className={styles.pagination} aria-label="Email pages">
                  <button
                    className={styles.pageButton}
                    type="button"
                    disabled={activityPage <= 1}
                    onClick={() => {
                      setActivityState("loading");
                      setActivityPage((value) => Math.max(1, value - 1));
                      setActivityReloadKey((k) => k + 1);
                    }}
                  >
                    Previous
                  </button>
                  <span className={styles.pageStatus}>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    className={styles.pageButton}
                    type="button"
                    disabled={activityPage >= pagination.totalPages}
                    onClick={() => {
                      setActivityState("loading");
                      setActivityPage((value) =>
                        Math.min(pagination.totalPages, value + 1),
                      );
                      setActivityReloadKey((k) => k + 1);
                    }}
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </div>
          </>
        )}
      </section>

      {/* D. Test email */}
      <section className={styles.panel} aria-label="Test email">
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Test email</h2>
            <p className={styles.panelSub}>
              Send a branded test email to verify the provider is working. Test
              emails do not consume any marketing allowance.
            </p>
          </div>
        </div>

        <form onSubmit={handleTestEmail} className={styles.actionForm}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Recipient address</label>
            <input
              className={styles.input}
              type="email"
              value={testRecipient}
              placeholder="alice@example.com"
              aria-label="Test email recipient"
              onChange={(event) => setTestRecipient(event.target.value)}
            />
          </div>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={testState === "sending" || !testRecipient}
          >
            {testState === "sending" ? "Sending…" : "Send test email"}
          </button>

          {testState === "done" && (
            <div className={styles.notice}>
              Test email queued for {testRecipient}.
            </div>
          )}

          {testState === "error" && testError && (
            <div className={styles.noticeDanger}>{testError}</div>
          )}
        </form>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statHint}>{hint}</p>
    </article>
  );
}
