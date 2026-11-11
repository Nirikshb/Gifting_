const MONEY = /^(\d+)(?:\.(\d{1,2}))?$/;

export function productPath(slug: string) {
  if (!slug || /[/?#\\]/.test(slug) || slug === "." || slug === "..") return null;
  return `/products/${encodeURIComponent(slug)}`;
}

export function inrAmount(price: string) {
  const match = price.trim().match(MONEY);
  if (!match) return null;

  const fraction = (match[2] ?? "").padEnd(2, "0");
  return `${match[1]}.${fraction}`;
}

export function formatInr(price: string) {
  const amount = inrAmount(price);
  return amount ? `₹${amount}` : null;
}

export function productImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}
