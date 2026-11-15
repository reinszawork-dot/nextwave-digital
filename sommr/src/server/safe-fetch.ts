import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { userAgent } from './env';

/**
 * Fetch a URL supplied by an admin (event feeds, pages to import) without letting
 * it reach private networks: only http(s), public IPs, limited redirects, size and time.
 */
export class UnsafeUrlError extends Error {}

function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true;
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return false;
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

async function assertPublic(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new UnsafeUrlError('Only http and https links can be imported.');
  if (url.username || url.password) throw new UnsafeUrlError('Links with credentials aren’t allowed.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new UnsafeUrlError('That address isn’t reachable from the internet.');
  }
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  if (ips.length === 0 || ips.some(isPrivateIp)) throw new UnsafeUrlError('That address isn’t reachable from the internet.');
}

export async function safeFetchText(
  input: string,
  { accept = 'text/html,application/xhtml+xml,text/calendar,application/ld+json;q=0.9,*/*;q=0.5', maxBytes = 3_000_000 } = {},
): Promise<{ text: string; finalUrl: string; contentType: string }> {
  let url = new URL(input);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': userAgent(), Accept: accept },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url);
      continue;
    }
    if (!res.ok) throw new Error(`The page answered with HTTP ${res.status}.`);
    const reader = res.body?.getReader();
    if (!reader) return { text: '', finalUrl: url.toString(), contentType: res.headers.get('content-type') ?? '' };
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('That page is too large to import.');
      }
      chunks.push(value);
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    return { text, finalUrl: url.toString(), contentType: res.headers.get('content-type') ?? '' };
  }
  throw new Error('Too many redirects.');
}
