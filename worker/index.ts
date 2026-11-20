/**
 * EasyDrink — API de copias de seguridad en la nube (Cloudflare Workers + KV).
 *
 * La app sube su base de datos completa (el mismo JSON de "Exportar copia")
 * y este Worker la guarda en KV:
 *   backup:latest      la copia más reciente
 *   backup:previous    la copia anterior a la más reciente
 *   backup:AAAA-MM-DD  la última copia de cada día (hora de Colombia), 180 días
 *
 * Acceso: la primera clave que se usa queda registrada (solo su hash SHA-256).
 * Desde entonces cada petición debe enviar esa clave en
 * "Authorization: Bearer <clave>". Si existe el secreto BACKUP_TOKEN en el
 * Worker, se usa ese en lugar de la clave registrada.
 */

interface KVNamespace {
  get(key: string, type: 'text'): Promise<string | null>;
  getWithMetadata<M>(key: string, type: 'text'): Promise<{ value: string | null; metadata: M | null }>;
  put(key: string, value: string, options?: { metadata?: unknown; expirationTtl?: number }): Promise<void>;
  list<M>(options: { prefix: string; cursor?: string }): Promise<{
    keys: { name: string; metadata?: M }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

interface Env {
  BACKUPS: KVNamespace;
  BACKUP_TOKEN?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface BackupMeta {
  savedAt: string;
  size: number;
  device?: string;
  transactions?: number;
  products?: number;
}

const AUTH_KEY = 'auth:hash';
const MAX_BODY = 20 * 1024 * 1024; // KV admite 25 MiB por valor
const DAILY_TTL = 180 * 24 * 60 * 60;
const MIN_KEY_LENGTH = 8;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Fecha AAAA-MM-DD en hora de Colombia. */
function colombiaDate(date = new Date()): string {
  return new Date(date.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

type AuthResult = { ok: true } | { ok: false; response: Response };

async function authorize(request: Request, env: Env, allowClaim: boolean): Promise<AuthResult> {
  const header = request.headers.get('authorization') || '';
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (key.length < MIN_KEY_LENGTH) {
    return { ok: false, response: json({ error: 'missing_key' }, 401) };
  }

  if (env.BACKUP_TOKEN) {
    return safeEqual(key, env.BACKUP_TOKEN) ? { ok: true } : { ok: false, response: json({ error: 'wrong_key' }, 403) };
  }

  const hash = await sha256(key);
  const stored = await env.BACKUPS.get(AUTH_KEY, 'text');
  if (!stored) {
    if (!allowClaim) return { ok: false, response: json({ error: 'not_configured' }, 404) };
    await env.BACKUPS.put(AUTH_KEY, hash);
    return { ok: true };
  }
  return safeEqual(hash, stored) ? { ok: true } : { ok: false, response: json({ error: 'wrong_key' }, 403) };
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.BACKUPS) return json({ error: 'storage_unavailable' }, 503);

  // GET /api/status — ¿ya hay una clave registrada? (no requiere clave)
  if (url.pathname === '/api/status' && request.method === 'GET') {
    const configured = Boolean(env.BACKUP_TOKEN) || Boolean(await env.BACKUPS.get(AUTH_KEY, 'text'));
    return json({ configured });
  }

  // POST /api/connect — valida la clave; la registra si es la primera vez.
  if (url.pathname === '/api/connect' && request.method === 'POST') {
    const auth = await authorize(request, env, true);
    if (!auth.ok) return auth.response;
    const { metadata } = await env.BACKUPS.getWithMetadata<BackupMeta>('backup:latest', 'text');
    return json({ ok: true, latest: metadata });
  }

  if (url.pathname === '/api/backups' && request.method === 'GET') {
    const auth = await authorize(request, env, false);
    if (!auth.ok) return auth.response;
    const items: { key: string; meta: BackupMeta | null }[] = [];
    let cursor: string | undefined;
    do {
      const page = await env.BACKUPS.list<BackupMeta>({ prefix: 'backup:', cursor });
      for (const k of page.keys) items.push({ key: k.name.slice('backup:'.length), meta: k.metadata ?? null });
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    items.sort((a, b) => (b.meta?.savedAt || '').localeCompare(a.meta?.savedAt || ''));
    return json({ items });
  }

  if (url.pathname === '/api/backup' && request.method === 'GET') {
    const auth = await authorize(request, env, false);
    if (!auth.ok) return auth.response;
    const key = url.searchParams.get('key') || 'latest';
    if (!/^(latest|previous|\d{4}-\d{2}-\d{2})$/.test(key)) return json({ error: 'bad_key' }, 400);
    const value = await env.BACKUPS.get(`backup:${key}`, 'text');
    if (value === null) return json({ error: 'not_found' }, 404);
    return new Response(value, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (url.pathname === '/api/backup' && request.method === 'PUT') {
    const auth = await authorize(request, env, true);
    if (!auth.ok) return auth.response;
    const body = await request.text();
    if (body.length > MAX_BODY) return json({ error: 'too_large' }, 413);

    let parsed: { version?: number; transactions?: unknown[]; products?: unknown[] };
    try {
      parsed = JSON.parse(body);
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.version) return json({ error: 'invalid_backup' }, 400);

    const meta: BackupMeta = {
      savedAt: new Date().toISOString(),
      size: body.length,
      device: (request.headers.get('x-device-name') || '').slice(0, 60) || undefined,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions.length : 0,
      products: Array.isArray(parsed.products) ? parsed.products.length : 0,
    };

    const previous = await env.BACKUPS.getWithMetadata<BackupMeta>('backup:latest', 'text');
    if (previous.value !== null) {
      await env.BACKUPS.put('backup:previous', previous.value, { metadata: previous.metadata ?? undefined });
    }
    await env.BACKUPS.put('backup:latest', body, { metadata: meta });
    await env.BACKUPS.put(`backup:${colombiaDate()}`, body, { metadata: meta, expirationTtl: DAILY_TTL });
    return json({ ok: true, meta });
  }

  return json({ error: 'not_found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: 'server_error', detail: err instanceof Error ? err.message : String(err) }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
