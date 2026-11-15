import 'server-only';
import sharp, { type OutputInfo } from 'sharp';
import { maybeOne, query, sql } from './db';
import { env } from './env';

/**
 * Private photo storage for memories. Images are re-encoded on the server (EXIF
 * — including GPS — is stripped, orientation fixed, size capped) and a thumbnail
 * is made. Stored in Postgres by default, or in a private Supabase Storage bucket
 * when STORAGE_DRIVER=supabase.
 */
export const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;
const FULL_PX = 1800;
const THUMB_PX = 560;

export class UploadError extends Error {}

function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.subarray(4, 12).toString('ascii').match(/^ftyp(heic|heix|mif1|avif)/)) return 'image/heif';
  return null;
}

async function supabaseRequest(method: 'POST' | 'GET' | 'DELETE', path: string, body?: Buffer) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('STORAGE_DRIVER=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_STORAGE_BUCKET}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      ...(body ? { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' } : {}),
    },
    body: body ? new Uint8Array(body) : undefined,
    cache: 'no-store',
  });
}

export async function saveImage(userId: string, file: File): Promise<string> {
  if (file.size === 0) throw new UploadError('That file is empty.');
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('Photos can be up to 7 MB.');
  const input = Buffer.from(await file.arrayBuffer());
  if (!sniff(input)) throw new UploadError('Please choose a JPEG, PNG or WebP photo.');
  let full: { data: Buffer; info: OutputInfo };
  let thumb: Buffer;
  try {
    const base = sharp(input, { failOn: 'error', limitInputPixels: 80_000_000 }).rotate();
    full = await base.clone().resize({ width: FULL_PX, height: FULL_PX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    thumb = await base.clone().resize({ width: THUMB_PX, height: THUMB_PX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 74, mozjpeg: true }).toBuffer();
  } catch {
    throw new UploadError('We couldn’t read that photo. Try a JPEG or PNG.');
  }
  if (env.STORAGE_DRIVER === 'supabase') {
    const row = await maybeOne<{ id: string }>(sql`
      insert into media (user_id, content_type, byte_size, width, height, storage)
      values (${userId}, 'image/jpeg', ${full.data.length}, ${full.info.width}, ${full.info.height}, 'supabase') returning id`);
    const key = `${userId}/${row!.id}`;
    const [a, b] = await Promise.all([
      supabaseRequest('POST', `${key}.jpg`, full.data),
      supabaseRequest('POST', `${key}-thumb.jpg`, thumb),
    ]);
    if (!a.ok || !b.ok) {
      await query(sql`delete from media where id = ${row!.id}`);
      throw new Error(`Photo storage failed (HTTP ${a.ok ? b.status : a.status}).`);
    }
    await query(sql`update media set storage_key = ${key} where id = ${row!.id}`);
    return row!.id;
  }
  const row = await maybeOne<{ id: string }>(sql`
    insert into media (user_id, content_type, byte_size, width, height, storage, data, thumb_data)
    values (${userId}, 'image/jpeg', ${full.data.length}, ${full.info.width}, ${full.info.height}, 'database', ${full.data}, ${thumb})
    returning id`);
  return row!.id;
}

/** Read a photo — only its owner can. */
export async function readImage(id: string, userId: string, size: 'full' | 'thumb'): Promise<Buffer | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await maybeOne<{ storage: string; storage_key: string | null; data: Uint8Array | null; thumb_data: Uint8Array | null }>(sql`
    select storage, storage_key, ${size === 'thumb' ? sql`thumb_data` : sql`data`} as data, null as thumb_data
    from media where id = ${id} and user_id = ${userId}`);
  if (!row) return null;
  if (row.storage === 'database') return row.data ? Buffer.from(row.data) : null;
  if (!row.storage_key) return null;
  const res = await supabaseRequest('GET', `${row.storage_key}${size === 'thumb' ? '-thumb' : ''}.jpg`);
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

export async function deleteImages(ids: string[], userId: string) {
  if (!ids.length) return;
  const rows = await query<{ storage: string; storage_key: string | null }>(sql`
    delete from media where id = any(${ids}) and user_id = ${userId} returning storage, storage_key`);
  for (const r of rows) {
    if (r.storage === 'supabase' && r.storage_key) {
      await supabaseRequest('DELETE', `${r.storage_key}.jpg`).catch(() => {});
      await supabaseRequest('DELETE', `${r.storage_key}-thumb.jpg`).catch(() => {});
    }
  }
}
