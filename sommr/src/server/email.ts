import 'server-only';
import { env } from './env';

/**
 * Transactional email through Resend (https://resend.com) when RESEND_API_KEY is set.
 * Without a key, development prints the message to the server log; production
 * reports that email isn't configured instead of pretending it was sent.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<{ sent: boolean; reason?: string }> {
  if (!env.RESEND_API_KEY) {
    if (!env.isProduction) {
      console.info(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n${text}\n`);
      return { sent: true };
    }
    return { sent: false, reason: 'Email is not configured on this server yet.' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) {
    console.error('[email] Resend error', res.status, await res.text().catch(() => ''));
    return { sent: false, reason: 'We couldn’t send the email. Please try again later.' };
  }
  return { sent: true };
}
