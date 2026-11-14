import {
  callToAction,
  heading,
  paragraph,
  renderEmailHtml,
  renderEmailText,
  type RenderedEmail,
} from './brand';

/**
 * Double opt-in confirmation email. Consent-verification content only: no
 * promotional copy, no marketing allowance consumed, link is single-use and
 * expires (handled by the backend token hash + expiry).
 */
export function renderNewsletterConfirmationEmail(input: {
  email: string;
  confirmationUrl: string;
}): RenderedEmail {
  const { email, confirmationUrl } = input;
  const subject = 'Confirm your Aapulki newsletter subscription';

  const html = renderEmailHtml({
    preheader: 'Confirm your Aapulki newsletter subscription.',
    footerNote:
      "You're receiving this because you asked Aapulki to send you the newsletter.",
    siteUrl: null,
    contentHtml: [
      heading('Confirm your subscription'),
      paragraph(
        `Hi there — we received your request to subscribe to the Aapulki newsletter for ${email}.`,
      ),
      paragraph(
        'Please confirm below. No promotional emails will be sent to you until you do.',
      ),
      callToAction('Confirm my subscription', confirmationUrl),
      paragraph(
        'If you did not sign up for this, you can ignore this email — nothing will be sent.',
        true,
      ),
    ].join('\n'),
  });

  const text = renderEmailText([
    'Confirm your subscription',
    `We received your request to subscribe to the Aapulki newsletter for ${email}.`,
    '',
    `Confirm your subscription: ${confirmationUrl}`,
    '',
    'No promotional emails will be sent to you until you confirm.',
    '',
    'If you did not sign up for this, you can ignore this email — nothing will be sent.',
  ]);

  return { subject, html, text };
}
