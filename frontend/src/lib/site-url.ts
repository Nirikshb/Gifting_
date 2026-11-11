const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function getSiteUrl() {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return null;

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (blockedHosts.has(host) || host.endsWith(".localhost")) return null;

  return url.origin;
}

export function publicPageMetadata(title: string, description: string, path: string) {
  const siteUrl = getSiteUrl();

  return {
    description,
    openGraph: {
      title,
      description,
      siteName: "Aapulki",
      type: "website" as const,
      ...(siteUrl ? { url: path } : {}),
    },
    twitter: {
      card: "summary" as const,
      title,
      description,
    },
    ...(siteUrl ? { alternates: { canonical: path } } : {}),
  };
}
