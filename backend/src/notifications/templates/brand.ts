/**
 * Shared presentation helpers for the transactional email templates.
 *
 * Every template renders the same ivory/blush identity the storefront uses
 * (`#f7f4ee` ivory, a blush accent), with inline styles and a fluid 600px
 * column so the mail renders sanely on a phone. All order data is escaped
 * here — an order with a `<script>` in its gift message must not become HTML.
 */

export const BRAND_NAME = 'Aapulki';

export const EMAIL_PALETTE = {
  ivory: '#f7f4ee',
  card: '#fdfcf9',
  blush: '#f0d9d4',
  blushDeep: '#b4736a',
  ink: '#1c1c1c',
  muted: '#6f6a62',
  line: '#e4dfd2',
} as const;

export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Money is stored as a numeric string. Mirrors the storefront: `₹58.00`.
 * Anything unrecognised is shown as-is rather than throwing — a rendering
 * problem must never abort the order transaction that queued the email.
 */
export function formatInr(value: string): string {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    return value;
  }

  const fraction = (match[2] ?? '').padEnd(2, '0');
  return `₹${match[1]}.${fraction}`;
}

export function isZeroAmount(value: string): boolean {
  return /^0*(?:\.0+)?$/.test(value.trim());
}

export function formatOrderDate(value: Date): string {
  try {
    return value.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value.toISOString().slice(0, 10);
  }
}

export function formatOrderDateTime(value: Date): string {
  try {
    return value.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value.toISOString();
  }
}

export function paragraph(text: string, muted = false): string {
  const color = muted ? EMAIL_PALETTE.muted : EMAIL_PALETTE.ink;
  return `<p style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${color};">${escapeHtml(text)}</p>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 12px 0;font-family:${FONT_STACK};font-size:24px;line-height:1.3;font-weight:600;color:${EMAIL_PALETTE.ink};">${escapeHtml(text)}</h1>`;
}

/** Small uppercase label used above detail blocks. */
export function label(text: string): string {
  return `<p style="margin:0 0 6px 0;font-family:${FONT_STACK};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_PALETTE.muted};">${escapeHtml(text)}</p>`;
}

/** Blush-tinted box for gift messages, cancellation reasons and notices. */
export function noticeBox(title: string, body: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border-collapse:collapse;">
    <tr>
      <td style="background-color:${EMAIL_PALETTE.blush};border-left:3px solid ${EMAIL_PALETTE.blushDeep};padding:14px 16px;border-radius:0 8px 8px 0;">
        ${label(title)}
        <p style="margin:0;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${EMAIL_PALETTE.ink};white-space:pre-wrap;">${escapeHtml(body)}</p>
      </td>
    </tr>
  </table>`;
}

export function callToAction(labelText: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px 0;">
    <tr>
      <td style="background-color:${EMAIL_PALETTE.ink};border-radius:999px;">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 26px;font-family:${FONT_STACK};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(labelText)}</a>
      </td>
    </tr>
  </table>`;
}

export function footerHtml(note: string, siteUrl: string | null): string {
  const siteLink = siteUrl
    ? `<p style="margin:8px 0 0 0;font-family:${FONT_STACK};font-size:13px;"><a href="${escapeHtml(siteUrl)}" style="color:${EMAIL_PALETTE.blushDeep};text-decoration:none;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a></p>`
    : '';

  return `<p style="margin:0;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:${EMAIL_PALETTE.muted};">${escapeHtml(note)}</p>${siteLink}`;
}

export type EmailDocument = {
  /** Shown as the inbox preview line; never visible in the opened email. */
  preheader: string;
  contentHtml: string;
  footerNote: string;
  siteUrl: string | null;
};

/**
 * Wraps template-specific content in the shared brand shell.
 */
export function renderEmailHtml(doc: EmailDocument): string {
  const preheader = escapeHtml(doc.preheader);
  const footer = footerHtml(doc.footerNote, doc.siteUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${preheader}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${EMAIL_PALETTE.ivory};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${EMAIL_PALETTE.ivory};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:${EMAIL_PALETTE.card};border:1px solid ${EMAIL_PALETTE.line};border-radius:14px;border-collapse:separate;overflow:hidden;">
            <tr>
              <td style="background-color:${EMAIL_PALETTE.blush};padding:20px 28px;border-bottom:1px solid ${EMAIL_PALETTE.line};">
                <span style="font-family:${FONT_STACK};font-size:19px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${EMAIL_PALETTE.ink};">${escapeHtml(BRAND_NAME)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${doc.contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background-color:${EMAIL_PALETTE.ivory};border-top:1px solid ${EMAIL_PALETTE.line};">
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

/** Joins plain-text lines exactly as written; `''` becomes a blank line. */
export function renderEmailText(
  lines: Array<string | null | undefined>,
): string {
  return lines
    .filter((line): line is string => typeof line === 'string')
    .join('\n');
}
