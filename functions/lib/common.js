export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function getDb(env) {
  return (env && (env.DB || env.D1)) || null;
}

export function getUsersDb(env) {
  return (env && env.USERS_DB) || getDb(env);
}

export function getSiteUrl(env, request) {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, '');
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
