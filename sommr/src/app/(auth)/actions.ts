'use server';

import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  clientIp,
  createSession,
  destroySession,
  dummyPasswordHash,
  hashPassword,
  rateLimit,
  sha256,
  verifyPassword,
} from '@/server/auth';
import { maybeOne, query, sql, transaction } from '@/server/db';
import { sendEmail } from '@/server/email';
import { env } from '@/server/env';

export interface FormState {
  error?: string;
  fields?: Record<string, string>;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
}

const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address'));
const password = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200, 'That password is too long');

function safeNext(next: unknown): string {
  const n = typeof next === 'string' ? next : '';
  return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : '/';
}

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}

const registerSchema = z.object({
  name: z.string().trim().min(1, 'What should we call you?').max(60),
  email,
  password,
});

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const fields = { name: String(form.get('name') ?? ''), email: String(form.get('email') ?? '') };
  const parsed = registerSchema.safeParse({ ...fields, password: form.get('password') });
  if (!parsed.success) return { fields, fieldErrors: fieldErrors(parsed.error) };

  if (!(await rateLimit(`register:${await clientIp()}`, 8, 3600))) {
    return { fields, error: 'Too many sign-ups from this connection. Please try again in an hour.' };
  }
  const { name, email: mail, password: pw } = parsed.data;
  const existing = await maybeOne(sql`select id from users where lower(email) = ${mail}`);
  if (existing) {
    return { fields, fieldErrors: { email: 'An account with this email already exists. Try signing in.' } };
  }
  const role = env.ADMIN_EMAILS.includes(mail) ? 'admin' : 'user';
  const user = await maybeOne<{ id: string }>(sql`
    insert into users (email, password_hash, display_name, role)
    values (${mail}, ${await hashPassword(pw)}, ${name}, ${role})
    on conflict do nothing
    returning id`);
  if (!user) return { fields, fieldErrors: { email: 'An account with this email already exists.' } };
  await createSession(user.id);
  redirect('/onboarding');
}

const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password').max(200) });

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const fields = { email: String(form.get('email') ?? '') };
  const parsed = loginSchema.safeParse({ email: form.get('email'), password: form.get('password') });
  if (!parsed.success) return { fields, fieldErrors: fieldErrors(parsed.error) };
  const { email: mail, password: pw } = parsed.data;

  const ip = await clientIp();
  const allowed =
    (await rateLimit(`login:ip:${ip}`, 30, 900)) && (await rateLimit(`login:email:${mail}`, 8, 900));
  if (!allowed) return { fields, error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' };

  const user = await maybeOne<{ id: string; password_hash: string; onboarded_at: Date | null }>(sql`
    select id, password_hash, onboarded_at from users where lower(email) = ${mail}`);
  const ok = await verifyPassword(pw, user?.password_hash ?? (await dummyPasswordHash()));
  if (!user || !ok) return { fields, error: 'That email and password don’t match an account.' };

  await createSession(user.id);
  redirect(user.onboarded_at ? safeNext(form.get('next')) : '/onboarding');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}

export async function requestResetAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(form.get('email'));
  const fields = { email: String(form.get('email') ?? '') };
  if (!parsed.success) return { fields, fieldErrors: { email: 'Enter a valid email address' } };
  if (!(await rateLimit(`reset:${await clientIp()}`, 5, 3600))) {
    return { fields, error: 'Too many reset requests. Please try again later.' };
  }
  const user = await maybeOne<{ id: string; display_name: string }>(sql`
    select id, display_name from users where lower(email) = ${parsed.data}`);
  if (user) {
    const token = randomBytes(32).toString('base64url');
    await query(sql`
      insert into password_resets (token_hash, user_id, expires_at)
      values (${sha256(token)}, ${user.id}, now() + interval '1 hour')`);
    const link = `${env.APP_URL}/reset-password?token=${token}`;
    const result = await sendEmail(
      parsed.data,
      'Reset your SOMMR password',
      `Hi ${user.display_name},\n\nUse this link to choose a new password. It works for one hour:\n${link}\n\nIf you didn’t ask for this, you can ignore this email.\n\n— SOMMR`,
    );
    if (!result.sent) return { fields, error: result.reason };
  }
  // Same response whether or not the account exists, so emails can't be enumerated.
  return { ok: true, message: 'If that email has an account, a reset link is on its way. It expires in one hour.' };
}

const resetSchema = z.object({ token: z.string().min(20).max(100), password });

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({ token: form.get('token'), password: form.get('password') });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { token, password: pw } = parsed.data;
  const hash = await hashPassword(pw);
  const userId = await transaction(async (t) => {
    const [row] = await t.query<{ user_id: string }>(sql`
      update password_resets set used_at = now()
      where token_hash = ${sha256(token)} and used_at is null and expires_at > now()
      returning user_id`);
    if (!row) return null;
    await t.query(sql`update users set password_hash = ${hash}, updated_at = now() where id = ${row.user_id}`);
    // Sign out every other device after a password change.
    await t.query(sql`delete from sessions where user_id = ${row.user_id}`);
    return row.user_id;
  });
  if (!userId) return { error: 'This reset link has expired or was already used. Request a new one.' };
  await createSession(userId);
  redirect('/');
}
