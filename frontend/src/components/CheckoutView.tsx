"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createCheckoutOrder } from "@/lib/api/orders";
import { formatInr } from "@/lib/api/product-format";
import { useCart } from "@/lib/cart/CartProvider";
import styles from "./CheckoutView.module.css";

type FormState = {
  customerName: string;
  customerEmail: string;
  recipientName: string;
  deliveryLine1: string;
  deliveryLine2: string;
  deliveryCity: string;
  deliveryPostcode: string;
  deliveryCountry: string;
  giftMessage: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM: FormState = {
  customerName: "",
  customerEmail: "",
  recipientName: "",
  deliveryLine1: "",
  deliveryLine2: "",
  deliveryCity: "",
  deliveryPostcode: "",
  deliveryCountry: "India",
  giftMessage: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTCODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/;
const GIFT_MESSAGE_LIMIT = 500;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const name = form.customerName.trim();
  const email = form.customerEmail.trim();
  const line1 = form.deliveryLine1.trim();
  const city = form.deliveryCity.trim();
  const postcode = form.deliveryPostcode.trim();
  const country = form.deliveryCountry.trim();

  if (!name) {
    errors.customerName = "Please enter your full name.";
  } else if (name.length > 150) {
    errors.customerName = "Name must be 150 characters or fewer.";
  }

  if (!email) {
    errors.customerEmail = "Please enter your email address.";
  } else if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    errors.customerEmail = "Please enter a valid email address.";
  }

  if (form.recipientName.trim().length > 150) {
    errors.recipientName = "Recipient name must be 150 characters or fewer.";
  }

  if (!line1) {
    errors.deliveryLine1 = "Please enter the first line of the delivery address.";
  } else if (line1.length > 200) {
    errors.deliveryLine1 = "Address line 1 must be 200 characters or fewer.";
  }

  if (form.deliveryLine2.trim().length > 200) {
    errors.deliveryLine2 = "Address line 2 must be 200 characters or fewer.";
  }

  if (!city) {
    errors.deliveryCity = "Please enter the city.";
  } else if (city.length > 100) {
    errors.deliveryCity = "City must be 100 characters or fewer.";
  }

  if (!postcode) {
    errors.deliveryPostcode = "Please enter the pincode.";
  } else if (!POSTCODE_PATTERN.test(postcode)) {
    errors.deliveryPostcode = "Please enter a valid pincode.";
  }

  if (!country) {
    errors.deliveryCountry = "Please enter the country.";
  } else if (country.length > 100) {
    errors.deliveryCountry = "Country must be 100 characters or fewer.";
  }

  if (form.giftMessage.trim().length > GIFT_MESSAGE_LIMIT) {
    errors.giftMessage = "Gift message must be 500 characters or fewer.";
  }

  return errors;
}

function readError(error: unknown): string {
  const statusCode = (error as { statusCode?: number } | null)?.statusCode;
  const message = error instanceof Error ? error.message : null;

  // statusCode 0 covers a failed fetch; "Request failed" covers a proxy or
  // gateway response that was not JSON.
  if (statusCode === 0 || message === "Request failed") {
    return "We could not reach the server. Please check your connection and try again. Your order has not been placed.";
  }

  if (message) {
    return message;
  }

  return "We could not place your order. Please try again.";
}

function money(value: string) {
  return formatInr(value) ?? `₹${value}`;
}

function shippingLabel(value: string) {
  return Number.parseFloat(value) === 0 ? "Free" : money(value);
}

export function CheckoutView() {
  const router = useRouter();
  const { cart, status, refresh } = useCart();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const items = cart?.items ?? [];
  const loading = status === "loading" && cart === null;
  const failed = status === "error" && cart === null;
  const blocked = items.some(
    (item) =>
      !item.isActive ||
      item.stockQuantity <= 0 ||
      item.quantity > item.stockQuantity,
  );
  const priceChanged = items.some((item) => item.priceChanged);
  const subtotal = cart?.subtotal ?? "0.00";
  const shipping = cart?.shipping ?? "0.00";
  const total = cart?.total ?? subtotal;

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then((data) => {
        if (cancelled || !data || typeof data !== "object") return;
        const profile = data as { displayName?: unknown; email?: unknown };

        setForm((current) => ({
          ...current,
          customerName:
            current.customerName ||
            (typeof profile.displayName === "string" ? profile.displayName : ""),
          customerEmail:
            current.customerEmail ||
            (typeof profile.email === "string" ? profile.email : ""),
        }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError(null);
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please check the highlighted fields and try again.");
      return;
    }

    setFormError(null);
    setSubmitting(true);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }

    try {
      const order = await createCheckoutOrder({
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        recipientName: form.recipientName.trim() || undefined,
        deliveryLine1: form.deliveryLine1.trim(),
        deliveryLine2: form.deliveryLine2.trim() || undefined,
        deliveryCity: form.deliveryCity.trim(),
        deliveryPostcode: form.deliveryPostcode.trim(),
        deliveryCountry: form.deliveryCountry.trim(),
        giftMessage: form.giftMessage.trim() || undefined,
        idempotencyKey: idempotencyKeyRef.current,
      });

      await refresh();
      router.push(
        `/orders/${encodeURIComponent(order.orderReference)}?token=${encodeURIComponent(order.confirmationToken)}`,
      );
    } catch (error) {
      setFormError(readError(error));
      setSubmitting(false);
      // Surface server-side changes such as a price or stock update.
      await refresh();
    }
  }

  return (
    <div className={styles.pageFill}>
      <section className={styles.page}>
        <div className={styles.intro}>
          <h1>Checkout</h1>
          <p>
            Guest checkout is available — no account is needed. We will confirm
            the final prices and stock when you place the order.
          </p>
        </div>

        {loading ? <p className={styles.loading}>Loading your bag…</p> : null}

        {failed ? (
          <div className={styles.errorState}>
            <p>Your bag could not be loaded right now.</p>
            <button
              className={styles.retry}
              type="button"
              onClick={() => void refresh()}
            >
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !failed && items.length === 0 ? (
          <div className={styles.empty}>
            <p>Your bag is empty, so there is nothing to check out.</p>
            <Link className={styles.emptyAction} href="/shop">
              Browse the shop
            </Link>
          </div>
        ) : null}

        {!loading && !failed && items.length > 0 ? (
          <div className={styles.layout}>
            <form className={styles.form} onSubmit={submit} noValidate>
              <section className={styles.section}>
                <h2>Your details</h2>
                <p className={styles.sectionNote}>
                  We use these details for the order receipt.
                </p>
                <div className={styles.grid}>
                  <TextField
                    id="customerName"
                    label="Full name"
                    value={form.customerName}
                    error={errors.customerName}
                    autoComplete="name"
                    maxLength={150}
                    required
                    onChange={(value) => update("customerName", value)}
                  />
                  <TextField
                    id="customerEmail"
                    label="Email address"
                    type="email"
                    value={form.customerEmail}
                    error={errors.customerEmail}
                    autoComplete="email"
                    inputMode="email"
                    maxLength={255}
                    required
                    onChange={(value) => update("customerEmail", value)}
                  />
                </div>
              </section>

              <section className={styles.section}>
                <h2>Recipient</h2>
                <p className={styles.sectionNote}>
                  Leave this blank if the order is for you.
                </p>
                <TextField
                  id="recipientName"
                  label="Recipient name (optional)"
                  value={form.recipientName}
                  error={errors.recipientName}
                  autoComplete="off"
                  maxLength={150}
                  onChange={(value) => update("recipientName", value)}
                />
              </section>

              <section className={styles.section}>
                <h2>Delivery address</h2>
                <div className={styles.grid}>
                  <TextField
                    id="deliveryLine1"
                    label="Address line 1"
                    value={form.deliveryLine1}
                    error={errors.deliveryLine1}
                    autoComplete="address-line1"
                    maxLength={200}
                    required
                    onChange={(value) => update("deliveryLine1", value)}
                  />
                  <TextField
                    id="deliveryLine2"
                    label="Address line 2 (optional)"
                    value={form.deliveryLine2}
                    error={errors.deliveryLine2}
                    autoComplete="address-line2"
                    maxLength={200}
                    onChange={(value) => update("deliveryLine2", value)}
                  />
                  <TextField
                    id="deliveryCity"
                    label="City"
                    value={form.deliveryCity}
                    error={errors.deliveryCity}
                    autoComplete="address-level2"
                    maxLength={100}
                    required
                    onChange={(value) => update("deliveryCity", value)}
                  />
                  <TextField
                    id="deliveryPostcode"
                    label="Pincode"
                    value={form.deliveryPostcode}
                    error={errors.deliveryPostcode}
                    hint="For example, 302001."
                    autoComplete="postal-code"
                    maxLength={20}
                    required
                    onChange={(value) => update("deliveryPostcode", value)}
                  />
                  <TextField
                    id="deliveryCountry"
                    label="Country"
                    value={form.deliveryCountry}
                    error={errors.deliveryCountry}
                    autoComplete="country-name"
                    maxLength={100}
                    required
                    onChange={(value) => update("deliveryCountry", value)}
                  />
                </div>
              </section>

              <section className={styles.section}>
                <h2>Gift message</h2>
                <p className={styles.sectionNote}>
                  Optional. It will be included with the order.
                </p>
                <div className={styles.field}>
                  <label htmlFor="giftMessage">Message</label>
                  <textarea
                    id="giftMessage"
                    className={errors.giftMessage ? styles.textareaInvalid : styles.textarea}
                    value={form.giftMessage}
                    maxLength={GIFT_MESSAGE_LIMIT}
                    rows={4}
                    aria-invalid={errors.giftMessage ? true : undefined}
                    aria-describedby={
                      errors.giftMessage ? "giftMessage-error" : "giftMessage-hint"
                    }
                    onChange={(event) => update("giftMessage", event.target.value)}
                  />
                  {errors.giftMessage ? (
                    <p id="giftMessage-error" className={styles.fieldError}>
                      {errors.giftMessage}
                    </p>
                  ) : (
                    <p id="giftMessage-hint" className={styles.hint}>
                      {form.giftMessage.length}/{GIFT_MESSAGE_LIMIT} characters
                    </p>
                  )}
                </div>
              </section>

              {blocked ? (
                <p className={styles.blocked} role="alert">
                  Some items in your bag need attention.{" "}
                  <Link href="/cart">Review your bag</Link> before placing the
                  order.
                </p>
              ) : null}

              {priceChanged ? (
                <p className={styles.priceNote}>
                  Some prices have changed since you added these items. The
                  current prices are shown in the summary.
                </p>
              ) : null}

              {formError ? (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              ) : null}

              <button
                className={styles.submit}
                type="submit"
                disabled={submitting || blocked}
              >
                {submitting ? "Placing order…" : "Place order"}
              </button>
              <p className={styles.submitNote}>
                No payment is collected online yet. Placing the order reserves
                the items and records the order as unpaid.
              </p>
            </form>

            <aside className={styles.summary} aria-label="Order summary">
              <h2>Order summary</h2>
              <ul className={styles.items}>
                {items.map((item) => (
                  <li className={styles.item} key={item.productId}>
                    <span className={styles.itemName}>
                      {item.name}
                      <span className={styles.itemQty}> × {item.quantity}</span>
                    </span>
                    <span className={styles.itemTotal}>
                      {money(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={styles.row}>
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className={styles.row}>
                <span>Shipping</span>
                <span>{shippingLabel(shipping)}</span>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
              <p className={styles.summaryNote}>
                Totals are recalculated on the server when the order is placed.
              </p>
              <Link className={styles.back} href="/cart">
                Back to bag
              </Link>
            </aside>
          </div>
        ) : null}
      </section>
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "tel";
  maxLength: number;
  required?: boolean;
  onChange: (value: string) => void;
};

function TextField({
  id,
  label,
  value,
  error,
  hint,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  required = false,
  onChange,
}: TextFieldProps) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        className={error ? styles.inputInvalid : styles.input}
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
