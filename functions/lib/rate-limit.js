import { getUsersDb } from './common.js';

async function hashKey(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest('SHA-1', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export async function ensureIdempotent(env, userId, endpoint, requestId) {
  if (!getUsersDb(env) || !requestId) return true;

  try {
    const now = Math.floor(Date.now() / 1000);
    await getUsersDb(env).prepare(
      'INSERT INTO requests (id, user_id, endpoint, created_at) VALUES (?, ?, ?, ?)'
    ).bind(requestId, userId, endpoint, now).run();
    return true;
  } catch (_) {
    return false;
  }
}

export async function checkRateLimit(env, userId, endpoint, limitPerMinute) {
  if (!getUsersDb(env)) return { allowed: true };

  const now = Math.floor(Date.now() / 1000);
  const minute = Math.floor(now / 60);
  const rawKey = `${userId}:${endpoint}:${minute}`;
  const key = await hashKey(rawKey);
  const windowStart = minute * 60;

  try {
    await getUsersDb(env).prepare(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = count + 1`
    ).bind(key, windowStart).run();
  } catch (e) {
    if (/UNIQUE|SQLITE_CONSTRAINT/i.test(String(e && e.message))) {
      await getUsersDb(env).prepare(
        'UPDATE rate_limits SET count = count + 1 WHERE key = ?'
      ).bind(key).run();
    } else {
      throw e;
    }
  }

  const row = await getUsersDb(env).prepare(
    'SELECT count FROM rate_limits WHERE key = ?'
  ).bind(key).first();

  if (!row) return { allowed: true, remaining: limitPerMinute - 1 };
  if (row.count > limitPerMinute) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: Math.max(0, limitPerMinute - row.count) };
}

export async function logAbuse(env, { userId, ip, endpoint, reason }) {
  void env; void userId; void ip; void endpoint; void reason;
}

export async function maybeCleanup(env) {
  if (!getUsersDb(env)) return;
  if (Math.random() > 0.02) return;

  try {
    const now = Math.floor(Date.now() / 1000);
    await Promise.all([
      getUsersDb(env).prepare(
        'DELETE FROM rate_limits WHERE window_start < ?'
      ).bind(now - 3600).run(),
      getUsersDb(env).prepare(
        'DELETE FROM requests WHERE created_at < ?'
      ).bind(now - 86400).run()
    ]);
  } catch (_) {}
}
