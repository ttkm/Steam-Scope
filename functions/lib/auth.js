import { getUsersDb, getSiteUrl, jsonResponse } from './common.js';

function utf8ToBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(b64) {
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  payload = { ...payload, iat: now, exp: now + 86400 };

  const headerB64 = utf8ToBase64Url(JSON.stringify(header));
  const payloadB64 = utf8ToBase64Url(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(unsigned));
  let sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  sigB64 = sigB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${unsigned}.${sigB64}`;
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const unsigned = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    let raw = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    while (raw.length % 4) raw += '=';
    const sigBytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(unsigned));
    if (!valid) return null;

    const payload = JSON.parse(base64UrlToUtf8(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function extractUser(request, env) {
  if (!env.JWT_SECRET) return null;
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)steamscope_session=([^\s;]+)/);
  if (!match) return null;
  return verifyJWT(match[1], env.JWT_SECRET);
}

export async function handleAuthLogin(request, env) {
  const siteUrl = getSiteUrl(env, request);
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || '/';
  const callbackUrl = `${siteUrl}/api/auth/callback?return_to=${encodeURIComponent(returnTo)}`;

  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': callbackUrl,
    'openid.realm': siteUrl + '/',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return new Response(null, {
    status: 302,
    headers: { 'Location': `https://steamcommunity.com/openid/login?${params}` }
  });
}

export async function handleAuthCallback(request, env) {
  const url = new URL(request.url);
  const siteUrl = getSiteUrl(env, request);
  const fallback = `${siteUrl}/`;

  const verifyParams = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    if (key.startsWith('openid.')) verifyParams.set(key, value);
  }
  verifyParams.set('openid.mode', 'check_authentication');

  let verifyText;
  try {
    const verifyResp = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: verifyParams.toString(),
    });
    verifyText = await verifyResp.text();
  } catch {
    return Response.redirect(`${fallback}?auth_error=steam_unreachable`, 302);
  }

  if (!verifyText.includes('is_valid:true')) {
    return Response.redirect(`${fallback}?auth_error=verification_failed`, 302);
  }

  const claimedId = url.searchParams.get('openid.claimed_id') || '';
  const idMatch = claimedId.match(/(\d{17})$/);
  if (!idMatch) {
    return Response.redirect(`${fallback}?auth_error=no_steam_id`, 302);
  }
  const steamId = idMatch[1];

  let username = steamId;
  let avatarUrl = '';
  if (env.STEAM_API_KEY) {
    try {
      const apiResp = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${env.STEAM_API_KEY}&steamids=${steamId}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (apiResp.ok) {
        const data = await apiResp.json();
        const p = data?.response?.players?.[0];
        if (p) { username = p.personaname || steamId; avatarUrl = p.avatarfull || ''; }
      }
    } catch (_) {}
  }

  let userId = crypto.randomUUID();
  const db = getUsersDb(env);
  if (!db) {
    return Response.redirect(`${fallback}?auth_error=db_not_configured`, 302);
  }
  const now = Math.floor(Date.now() / 1000);
  try {
    const existing = await db.prepare('SELECT id FROM users WHERE steam_id = ?').bind(steamId).first();
    if (existing) {
      userId = existing.id;
      await db.prepare('UPDATE users SET username = ?, avatar_url = ?, last_login_at = ? WHERE id = ?')
        .bind(username || '', avatarUrl || '', now, userId).run();
    } else {
      await db.prepare(
        'INSERT INTO users (id, steam_id, username, avatar_url, last_login_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(userId, steamId, username || '', avatarUrl || '', now).run();
    }
  } catch (e) {
    const errMsg = (e && (e.message || e.cause?.message || String(e))) || 'Unknown error';
    const msgParam = errMsg.length > 200 ? errMsg.slice(0, 200) + '…' : errMsg;
    return Response.redirect(`${fallback}?auth_error=db_error&msg=${encodeURIComponent(msgParam)}`, 302);
  }

  if (!env.JWT_SECRET) {
    return Response.redirect(`${fallback}?auth_error=server_config`, 302);
  }

  const jwt = await signJWT({ sub: userId, steam_id: steamId, username, avatar: avatarUrl }, env.JWT_SECRET);
  const isSecure = siteUrl.startsWith('https');
  const cookie = `steamscope_session=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isSecure ? '; Secure' : ''}`;

  const returnTo = url.searchParams.get('return_to') || '/';
  const dest = returnTo.startsWith('/') ? `${siteUrl}${returnTo}` : fallback;

  return new Response(null, { status: 302, headers: { 'Location': dest, 'Set-Cookie': cookie } });
}

export function handleAuthLogout(request, env) {
  const siteUrl = getSiteUrl(env, request);
  const isSecure = siteUrl.startsWith('https');
  const cookie = `steamscope_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? '; Secure' : ''}`;
  return new Response(null, { status: 302, headers: { 'Location': `${siteUrl}/`, 'Set-Cookie': cookie } });
}

export async function handleAuthMe(request, env) {
  const user = await extractUser(request, env);
  if (!user) return jsonResponse({ guest: true });

  if (getUsersDb(env)) {
    try {
      const row = await getUsersDb(env).prepare('SELECT id FROM users WHERE id = ?').bind(user.sub).first();
      if (!row && user.steam_id) {
        const now = Math.floor(Date.now() / 1000);
        await getUsersDb(env).prepare(
          'INSERT INTO users (id, steam_id, username, avatar_url, last_login_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(user.sub, user.steam_id, user.username || user.steam_id, user.avatar || '', now).run();
      }
    } catch (_) {}
  }

  return jsonResponse({
    guest: false,
    user: { id: user.sub, steam_id: user.steam_id, username: user.username, avatar: user.avatar }
  });
}
