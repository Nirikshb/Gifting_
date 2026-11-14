import {
  callToAction,
  escapeHtml,
  heading,
  FONT_STACK,
  EMAIL_PALETTE,
  renderEmailHtml,
  renderEmailText,
  type RenderedEmail,
} from './brand';

export type CampaignEmailInput = {
  subject: string;
  heading: string;
  /** Plain-text body; paragraphs are separated by blank lines. */
  content: string;
  /** Optional image URL; only http(s) URLs are rendered. */
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};

/**
 * Renders the stored campaign content inside the shared, code-controlled
 * brand shell. No HTML from the request or the database is ever accepted:
 * every text node passes through `escapeHtml`, and only http(s) URLs are
 * allowed for the optional image and call-to-action destination.
 */
export function renderCampaignEmail(input: CampaignEmailInput): RenderedEmail {
  const subject = input.subject;
  const body = renderContentHtml(input.content);
  const image = renderImage(input.imageUrl);
  const cta = renderCallToAction(input.ctaLabel, input.ctaUrl);

  const html = renderEmailHtml({
    preheader: input.heading,
    footerNote:
      'You are receiving this email because you subscribed to the Aapulki newsletter.',
    siteUrl: null,
    contentHtml: [heading(input.heading), image, body, cta]
      .filter((part) => part.length > 0)
      .join('\n'),
  });

  const textLines = [
    input.heading,
    '',
    ...input.content.split(/\n/).map((line) => line.trimEnd()),
  ];

  const ctaLabel = input.ctaLabel?.trim();
  const ctaUrl = sanitizeHttpUrl(input.ctaUrl);
  if (ctaLabel && ctaUrl) {
    textLines.push('', `${ctaLabel}: ${ctaUrl}`);
  }

  const imageUrl = sanitizeHttpUrl(input.imageUrl);
  if (imageUrl) {
    textLines.push('', `Image: ${imageUrl}`);
  }

  textLines.push(
    '',
    'You are receiving this email because you subscribed to the Aapulki newsletter.',
  );

  return { subject, html, text: renderEmailText(textLines) };
}

function renderContentHtml(content: string): string {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraphText) => paragraphText.trim())
    .filter((paragraphText) => paragraphText.length > 0);

  return paragraphs
    .map((paragraphText) => {
      const lines = paragraphText
        .split('\n')
        .map((line) => escapeHtml(line.trim()))
        .filter((line) => line.length > 0);
      return `<p style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${EMAIL_PALETTE.ink};">${lines.join('<br>')}</p>`;
    })
    .join('\n');
}

function renderImage(imageUrl: string | null | undefined): string {
  const url = sanitizeHttpUrl(imageUrl);
  if (!url) {
    return '';
  }
  return `<img src="${escapeHtml(url)}" alt="" style="display:block;width:100%;max-width:544px;height:auto;margin:0 0 16px 0;border-radius:10px;border:1px solid ${EMAIL_PALETTE.line};">`;
}

function renderCallToAction(
  label: string | null | undefined,
  url: string | null | undefined,
): string {
  const ctaLabel = label?.trim();
  const safeUrl = sanitizeHttpUrl(url);
  if (!ctaLabel || !safeUrl) {
    return '';
  }
  return callToAction(ctaLabel, safeUrl);
}

/** Only http(s) URLs are allowed; anything else is dropped. */
function sanitizeHttpUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\/.+/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
