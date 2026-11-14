"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createAdminProduct,
  getAdminProduct,
  listStockAdjustments,
  updateAdminProduct,
  updateAdminProductStock,
  uploadAdminProductImage,
  type AdminProductDetail,
  type ProductImage,
  type StockAdjustment,
} from "@/lib/api/products";
import { formatInr } from "@/lib/api/product-format";
import { formatOrderDateTime } from "@/lib/orders/format";
import styles from "./admin.module.css";

type Mode = "create" | "edit";

type FormState = {
  name: string;
  slug: string;
  description: string;
  price: string;
  category: string;
  stockQuantity: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  price: "",
  category: "",
  stockQuantity: "0",
  isActive: true,
};

const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function statusOf(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return 0;
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function AdminProductForm({
  mode,
  productId,
}: {
  mode: Mode;
  productId?: number;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [image, setImage] = useState<ProductImage | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [stockValue, setStockValue] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState("");
  const [stockNotice, setStockNotice] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const router = useRouter();

  const applyProductState = useCallback(
    (loaded: AdminProductDetail, history: StockAdjustment[]) => {
      setProduct(loaded);
      setAdjustments(history);
      setForm({
        name: loaded.name,
        slug: loaded.slug,
        description: loaded.description,
        price: loaded.price,
        category: loaded.category,
        stockQuantity: String(loaded.stockQuantity),
        isActive: loaded.isActive,
      });
      setStockValue(String(loaded.stockQuantity));
      setSlugTouched(true);
    },
    [],
  );

  const load = useCallback(async () => {
    if (mode !== "edit" || productId === undefined) return;

    try {
      const [loaded, history] = await Promise.all([
        getAdminProduct(productId),
        listStockAdjustments(productId),
      ]);

      applyProductState(loaded, history);
    } catch (loadFailure) {
      setLoadError(
        statusOf(loadFailure) === 404
          ? "This product no longer exists."
          : messageOf(loadFailure, "We could not load this product."),
      );
    } finally {
      setLoading(false);
    }
  }, [mode, productId, applyProductState]);

  useEffect(() => {
    if (mode !== "edit" || productId === undefined) return;

    let cancelled = false;

    getAdminProduct(productId)
      .then((loaded) =>
        listStockAdjustments(productId).then((history) => ({
          loaded,
          history,
        })),
      )
      .then(({ loaded, history }) => {
        if (cancelled) return;
        applyProductState(loaded, history);
        setLoading(false);
      })
      .catch((loadFailure) => {
        if (cancelled) return;
        setLoadError(
          statusOf(loadFailure) === 404
            ? "This product no longer exists."
            : messageOf(loadFailure, "We could not load this product."),
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, productId, applyProductState]);

  const imagePreview = useMemo(() => {
    if (removeImage) return null;
    if (image) return image.url;
    return product?.imageUrl ?? null;
  }, [image, product, removeImage]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  function validate() {
    const errors: Record<string, string> = {};

    if (form.name.trim() === "") errors.name = "Give the product a name.";
    if (form.slug.trim() === "") errors.slug = "Give the product a slug.";
    if (form.description.trim() === "") {
      errors.description = "Describe the product.";
    }
    if (!PRICE_PATTERN.test(form.price.trim())) {
      errors.price = "Use a price with up to two decimals, for example 249.50.";
    }
    if (form.category.trim() === "") errors.category = "Choose a category.";

    if (mode === "create") {
      const stock = Number(form.stockQuantity);
      if (!Number.isInteger(stock) || stock < 0) {
        errors.stockQuantity = "Stock must be a whole number of 0 or more.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    setError("");
    setNotice("");

    if (!validate()) return;

    setSaving(true);

    try {
      if (mode === "create") {
        const created = await createAdminProduct({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          description: form.description.trim(),
          price: form.price.trim(),
          category: form.category.trim(),
          stockQuantity: Number(form.stockQuantity),
          isActive: form.isActive,
          imageId: image?.id ?? null,
        });

        setNotice(`${created.name} was added to the catalogue.`);
        setForm({ ...EMPTY_FORM, category: created.category });
        setImage(null);
        setRemoveImage(false);
        setSlugTouched(false);
        router.push("/admin/products");
        return;
      }

      if (productId === undefined) return;

      const updated = await updateAdminProduct(productId, {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim(),
        price: form.price.trim(),
        category: form.category.trim(),
        isActive: form.isActive,
        imageId: removeImage ? null : (image?.id ?? undefined),
      });

      setProduct(updated);
      setNotice(`${updated.name} was saved.`);
      setRemoveImage(false);
      void load();
    } catch (submitFailure) {
      setError(
        messageOf(
          submitFailure,
          "The product could not be saved. Please try again.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveStock(event: FormEvent) {
    event.preventDefault();
    if (!product || stockSaving) return;

    setStockError("");
    setStockNotice("");

    const quantity = Number(stockValue);

    if (!Number.isInteger(quantity) || quantity < 0) {
      setStockError("Stock must be a whole number of 0 or more.");
      return;
    }

    if (stockReason.trim() === "") {
      setStockError("Add a short reason so the change can be traced.");
      return;
    }

    setStockSaving(true);

    try {
      const result = await updateAdminProductStock(
        product.id,
        quantity,
        stockReason.trim(),
      );

      setProduct(result.product);
      setStockReason("");

      if (result.changed) {
        setStockNotice(
          `Stock updated from ${result.adjustment?.previousQuantity} to ${result.adjustment?.newQuantity}.`,
        );
      } else {
        setStockNotice("The quantity was already set to that number.");
      }

      const history = await listStockAdjustments(product.id);
      setAdjustments(history);
    } catch (stockFailure) {
      setStockError(
        messageOf(stockFailure, "The stock could not be updated."),
      );
    } finally {
      setStockSaving(false);
    }
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      const uploaded = await uploadAdminProductImage(file);
      setImage(uploaded);
      setRemoveImage(false);
    } catch (uploadFailure) {
      setUploadError(
        messageOf(uploadFailure, "The image could not be uploaded."),
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.panelSkeleton} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <p className={styles.emptyTitle}>We could not open this product</p>
          <p className={styles.emptyText}>{loadError}</p>
          <div className={styles.stateActions}>
            <button
              className={styles.retry}
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError("");
                void load();
              }}
            >
              Try again
            </button>
            <Link className={styles.backLink} href="/admin/products">
              Back to products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <p className={styles.eyebrow}>Studio</p>
          <h1 className={styles.pageTitle}>
            {mode === "create" ? "Add product" : product?.name}
          </h1>
          <p className={styles.pageSub}>
            {mode === "create"
              ? "Products appear in the shop as soon as they are listed with stock."
              : "Change the details of the product. Stock is adjusted separately so every change keeps a reason."}
          </p>
        </div>
        <Link className={styles.actionButton} href="/admin/products">
          Back to products
        </Link>
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className={styles.noticeDanger} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.formLayout}>
        <form className={styles.detailCard} onSubmit={submit} noValidate>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Name</span>
              <input
                className={styles.input}
                type="text"
                value={form.name}
                maxLength={150}
                placeholder="Kraft Gift Box"
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name: value,
                    slug: slugTouched ? current.slug : slugify(value),
                  }));
                  setFieldErrors((current) => ({
                    ...current,
                    name: "",
                  }));
                }}
              />
              {fieldErrors.name ? (
                <span className={styles.inputError}>{fieldErrors.name}</span>
              ) : null}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Slug</span>
              <input
                className={styles.input}
                type="text"
                value={form.slug}
                maxLength={180}
                placeholder="kraft-gift-box"
                onChange={(event) => {
                  setSlugTouched(true);
                  update("slug", event.target.value);
                }}
              />
              <span className={styles.fieldHint}>
                Lowercase letters, numbers and hyphens. This becomes the product
                link.
              </span>
              {fieldErrors.slug ? (
                <span className={styles.inputError}>{fieldErrors.slug}</span>
              ) : null}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Price</span>
              <input
                className={styles.input}
                type="text"
                inputMode="decimal"
                value={form.price}
                placeholder="249.50"
                onChange={(event) => update("price", event.target.value)}
              />
              {form.price && PRICE_PATTERN.test(form.price.trim()) ? (
                <span className={styles.fieldHint}>
                  Shown in the shop as {formatInr(form.price.trim())}.
                </span>
              ) : null}
              {fieldErrors.price ? (
                <span className={styles.inputError}>{fieldErrors.price}</span>
              ) : null}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Category</span>
              <input
                className={styles.input}
                type="text"
                value={form.category}
                maxLength={80}
                placeholder="gift boxes"
                onChange={(event) => update("category", event.target.value)}
              />
              {fieldErrors.category ? (
                <span className={styles.inputError}>{fieldErrors.category}</span>
              ) : null}
            </label>

            {mode === "create" ? (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Stock quantity</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  step={1}
                  value={form.stockQuantity}
                  onChange={(event) =>
                    update("stockQuantity", event.target.value)
                  }
                />
                {fieldErrors.stockQuantity ? (
                  <span className={styles.inputError}>
                    {fieldErrors.stockQuantity}
                  </span>
                ) : null}
              </label>
            ) : null}

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Description</span>
              <textarea
                className={styles.textarea}
                rows={4}
                value={form.description}
                maxLength={5000}
                placeholder="What is in the box and why people love it."
                onChange={(event) => update("description", event.target.value)}
              />
              {fieldErrors.description ? (
                <span className={styles.inputError}>
                  {fieldErrors.description}
                </span>
              ) : null}
            </label>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Image</span>
            <div className={styles.imageRow}>
              {imagePreview ? (
                <img
                  className={styles.imagePreview}
                  src={imagePreview}
                  alt="Product preview"
                />
              ) : (
                <span className={styles.imagePlaceholder} aria-hidden="true">
                  No image
                </span>
              )}
              <div className={styles.imageActions}>
                <label className={styles.fileButton}>
                  <span>{uploading ? "Uploading…" : "Choose image"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    disabled={uploading}
                    onChange={(event) => {
                      void handleImage(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                {imagePreview ? (
                  <button
                    className={styles.ghostButton}
                    type="button"
                    disabled={uploading}
                    onClick={() => {
                      setImage(null);
                      setRemoveImage(true);
                    }}
                  >
                    Remove image
                  </button>
                ) : null}
                <p className={styles.fieldHint}>
                  JPEG, PNG, WebP, GIF or AVIF, up to 5 MB. The file is stored on
                  the server; the shop never accepts a link to someone else&rsquo;s
                  image.
                </p>
                {uploadError ? (
                  <span className={styles.inputError}>{uploadError}</span>
                ) : null}
              </div>
            </div>
          </div>

          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => update("isActive", event.target.checked)}
            />
            <span>
              <strong>List this product in the shop</strong>
              <span className={styles.fieldHint}>
                Hidden products stay in the catalogue but cannot be bought.
              </span>
            </span>
          </label>

          <div className={styles.formActions}>
            <button className={styles.primaryButton} type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : mode === "create"
                  ? "Create product"
                  : "Save changes"}
            </button>
            <Link className={styles.ghostButton} href="/admin/products">
              Cancel
            </Link>
          </div>
        </form>

        {mode === "edit" && product ? (
          <aside className={styles.sideStack}>
            <section className={styles.detailCard}>
              <h2 className={styles.cardTitle}>Stock</h2>
              <p className={styles.cardHint}>
                Stock is the number of pieces ready to sell. Checkout reserves
                stock when an order is placed, so this number drops on its own.
              </p>

              <div className={styles.stockSummary}>
                <div>
                  <p className={styles.infoLabel}>Available now</p>
                  <p className={styles.stockValue}>{product.stockQuantity}</p>
                </div>
                <span
                  className={`${styles.stockBadge} ${styles[`stock${product.stockState}`]}`}
                >
                  {product.stockState === "out"
                    ? "Out of stock"
                    : product.stockState === "low"
                      ? "Low stock"
                      : "In stock"}
                </span>
              </div>

              <form className={styles.actionForm} onSubmit={saveStock}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>New quantity</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    step={1}
                    value={stockValue}
                    onChange={(event) => setStockValue(event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Reason</span>
                  <input
                    className={styles.input}
                    type="text"
                    maxLength={500}
                    value={stockReason}
                    placeholder="Received a new delivery"
                    onChange={(event) => setStockReason(event.target.value)}
                  />
                </label>
                {stockError ? (
                  <p className={styles.errorText} role="alert">
                    {stockError}
                  </p>
                ) : null}
                {stockNotice ? (
                  <p className={styles.notice} role="status">
                    {stockNotice}
                  </p>
                ) : null}
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={stockSaving}
                >
                  {stockSaving ? "Updating…" : "Update stock"}
                </button>
              </form>
            </section>

            <section className={styles.detailCard}>
              <h2 className={styles.cardTitle}>Stock history</h2>
              {adjustments.length === 0 ? (
                <p className={styles.cardHint}>
                  No stock changes recorded for this product yet.
                </p>
              ) : (
                <ul className={styles.adjustmentList}>
                  {adjustments.map((adjustment) => (
                    <li key={adjustment.id}>
                      <p className={styles.adjustmentLine}>
                        <strong>
                          {adjustment.previousQuantity} → {adjustment.newQuantity}
                        </strong>
                        <span
                          className={
                            adjustment.delta > 0
                              ? styles.deltaUp
                              : styles.deltaDown
                          }
                        >
                          {adjustment.delta > 0 ? "+" : ""}
                          {adjustment.delta}
                        </span>
                      </p>
                      <p className={styles.adjustmentReason}>
                        {adjustment.reason}
                      </p>
                      <p className={styles.adjustmentDate}>
                        {formatOrderDateTime(adjustment.createdAt)} ·{" "}
                        {adjustment.actorType === "admin"
                          ? "Studio"
                          : adjustment.actorType}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
