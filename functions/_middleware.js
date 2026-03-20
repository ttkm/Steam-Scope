import { corsHeaders, jsonResponse } from './lib/common.js';
import { extractUser, handleAuthCallback, handleAuthLogin, handleAuthLogout, handleAuthMe } from './lib/auth.js';
import { handleSearch, handleStatus, handleUnicodeGroup } from './lib/groups.js';
import { handleProfile } from './lib/profile.js';
import { handleVanityCheck } from './lib/vanity.js';

export async function onRequest(context) {
  const { request, env } = context;

  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/'; // normalize: no trailing slash

    // Extract authenticated user from JWT cookie (null for guests)
    const user = await extractUser(request, env);

    // --------------- Auth routes ---------------
    if (path === '/api/auth/login') {
      return handleAuthLogin(request, env);
    }
    if (path === '/api/auth/callback') {
      return handleAuthCallback(request, env);
    }
    if (path === '/api/auth/logout') {
      return handleAuthLogout(request, env);
    }
    if (path === '/api/auth/me') {
      return handleAuthMe(request, env);
    }

    // --------------- API routes ---------------
    if (path.startsWith('/api/')) {
      if (path === '/api/health') {
        return jsonResponse({ status: 'ok' });
      }

      if (path === '/api/status') {
        return handleStatus(env);
      }

      if (path === '/api/search' || path === '/api/groups/search') {
        if (request.method === 'POST') {
          return handleSearch(request, env, user);
        }
        return jsonResponse({ error: 'method not allowed - use post' }, 405);
      }

      if (path === '/api/vanity/check' && request.method === 'POST') {
        return handleVanityCheck(request, env, user);
      }

      return jsonResponse({ error: 'not found' }, 404);
    }

    if (path.startsWith('/steam/groups/unicode/')) {
      // Require auth to prevent unauthenticated scraping.
      if (!user) {
        return new Response('login required to view group unicode data', {
          status: 401,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders }
        });
      }
      const pathAfter = path.split('/steam/groups/unicode/')[1] || '';
      const gid = pathAfter.split('/')[0].trim();
      if (!gid) {
        return new Response('group id required', {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders }
        });
      }
      return handleUnicodeGroup(gid, env);
    }

    if (path.startsWith('/profile/')) {
      const steamId = path.split('/profile/')[1];
      if (!steamId) {
        return jsonResponse({ error: 'steam id required' }, 400);
      }
      return handleProfile(steamId, request, env, user);
    }

    return context.next();
  } catch (_) {
    return new Response(
      JSON.stringify({ error: 'internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
