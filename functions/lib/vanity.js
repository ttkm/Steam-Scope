import { jsonResponse } from './common.js';
import { checkRateLimit, ensureIdempotent, logAbuse, maybeCleanup } from './rate-limit.js';
import { resolveSteamId, resolveVanityUrlWithApi } from './steam.js';

export async function handleVanityCheck(request, env, user) {
  try {
    if (!user) {
      return jsonResponse({ error: 'login required to find ids', code: 'AUTH_REQUIRED' }, 401);
    }

    await maybeCleanup(env);

    const rate = await checkRateLimit(env, user.sub, 'vanity_check', 3000);
    if (!rate.allowed) {
      await logAbuse(env, {
        userId: user.sub,
        ip: request.headers.get('CF-Connecting-IP'),
        endpoint: 'vanity_check',
        reason: 'rate_limit'
      });
      return jsonResponse({ error: 'too many requests', code: 'RATE_LIMITED' }, 429);
    }

    const requestId = request.headers.get('X-Request-Id') || null;
    const idemOk = await ensureIdempotent(env, user.sub, 'vanity_check', requestId);
    if (!idemOk) {
      await logAbuse(env, {
        userId: user.sub,
        ip: request.headers.get('CF-Connecting-IP'),
        endpoint: 'vanity_check',
        reason: 'replay'
      });
      return jsonResponse({ error: 'duplicate request', code: 'IDEMPOTENT_REPLAY' }, 409);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'invalid json body' }, 400);
    }
    const rawId = (body && typeof body.id === 'string') ? body.id.trim() : '';
    if (!rawId) {
      return jsonResponse({ error: 'id is required' }, 400);
    }

    const id = rawId.toLowerCase().replace(/[^a-z0-9_\-]/g, '');
    if (!id || id.length > 32) {
      return jsonResponse({ error: 'invalid id format' }, 400);
    }

    let resolved;
    try {
      if (env.STEAM_API_KEY) {
        resolved = await resolveVanityUrlWithApi(env.STEAM_API_KEY, id);
      } else {
        resolved = await resolveSteamId(id);
      }
    } catch (e) {
      if (e && e.message === 'RATE_LIMITED') {
        return jsonResponse({ error: 'too many requests', code: 'RATE_LIMITED' }, 429);
      }
      if (e && (e.message === 'AMBIGUOUS' || e.message === 'STEAM_ERROR')) {
        return jsonResponse({ id, available: false, uncertain: true, resolved_id: null });
      }
      throw e;
    }
    const available = !resolved;

    return jsonResponse({
      id,
      available,
      resolved_id: resolved || null
    });
  } catch (e) {
    const msg = (e && e.message) ? String(e.message) : '';
    return jsonResponse({
      error: msg || 'vanity check failed',
      code: 'DB_ERROR',
      db_message: msg || undefined
    }, 500);
  }
}
