// No provider tokens, authorization codes, keys, or request bodies may be logged.
// Pure Web APIs keep this handler testable without a hosted project or credentials.
export interface AppleDeletionConfig {
  enabled: boolean;
  supabaseUrl: string;
  isolatedProjectRef: string;
  anonKey: string;
  serviceKey: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}
const APPLE = 'https://appleid.apple.com';
const CLIENT_ID = 'com.dyadhealthcollective.galactoguide';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
function fail(): never { throw new Error('apple_deletion_unconfirmed'); }
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const unb64 = (s: string) => Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
const jsonPart = (value: unknown) => b64(encoder.encode(JSON.stringify(value)));
const jwtParts = (token: string) => {
  if (token.length > 16384 || token.split('.').length !== 3) fail();
  const [h, p, s] = token.split('.');
  return { header: JSON.parse(new TextDecoder().decode(unb64(h))), claims: JSON.parse(new TextDecoder().decode(unb64(p))), signature: unb64(s), signed: encoder.encode(`${h}.${p}`) };
};
async function boundedJson(source: Request | Response, max: number) {
  const reader = source.body?.getReader();
  if (!reader) fail();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > max) fail();
      chunks.push(next.value);
    }
  } finally { await reader.cancel(); }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(data));
}
async function clientSecret(config: AppleDeletionConfig, now: number) {
  const der = Uint8Array.from(atob(config.privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const input = `${jsonPart({ alg: 'ES256', kid: config.keyId })}.${jsonPart({ iss: config.teamId, iat: now, exp: now + 300, aud: APPLE, sub: CLIENT_ID })}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(input));
  return `${input}.${b64(new Uint8Array(signature))}`;
}
export async function verifyAppleToken(token: string, keys: JsonWebKey[], subject: string, nonce: string, now: number) {
  const { header, claims, signature, signed } = jwtParts(token);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') fail();
  const matches = keys.filter(k => (k as JsonWebKey & { kid?: string }).kid === header.kid && k.kty === 'RSA' && k.alg === 'RS256' && k.use === 'sig');
  if (matches.length !== 1) fail();
  const key = await crypto.subtle.importKey('jwk', matches[0], { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed)) fail();
  if (claims.iss !== APPLE || claims.aud !== CLIENT_ID || claims.sub !== subject || claims.nonce !== nonce ||
      !Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) ||
      claims.iat > now + 30 || claims.iat < now - 300) fail();
}

export function createAppleDeletionHandler(config: AppleDeletionConfig, request: typeof fetch = fetch) {
  const reply = (data: object, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  const call = async (url: string, init: RequestInit = {}) => {
    // Fixed origins and paths only; never follow a redirect with credentials.
    return await request(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) });
  };
  const rpc = async (name: string, args: object) => {
    const r = await call(`${config.supabaseUrl}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    if (!r.ok) fail();
    return await boundedJson(r, 65536);
  };
  return async (req: Request): Promise<Response> => {
    // Native only: do not expand browser CORS or provide an unauthenticated flow.
    if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
    if (!config.enabled || !/^[a-z0-9]{20}$/.test(config.isolatedProjectRef) ||
        config.isolatedProjectRef === 'axxuefnkoxfifftjnuxo' ||
        config.supabaseUrl !== `https://${config.isolatedProjectRef}.supabase.co` ||
        !config.anonKey || !config.serviceKey || !config.privateKey ||
        !/^[A-Z0-9]{10}$/.test(config.teamId) || !/^[A-Z0-9]{10}$/.test(config.keyId)) {
      return reply({ error: 'apple_deletion_disabled' }, 503);
    }
    try {
      if (req.headers.get('origin') || !req.headers.get('content-type')?.startsWith('application/json')) fail();
      const authorization = req.headers.get('authorization') ?? '';
      if (!/^Bearer [A-Za-z0-9_.-]+$/.test(authorization) || authorization.length > 8192) fail();
      const body = await boundedJson(req, 8192);
      if (body.confirmation !== 'DELETE' || !['challenge', 'complete'].includes(body.action)) fail();
      const allowed = body.action === 'challenge' ? ['action', 'confirmation'] : ['action', 'confirmation', 'requestId', 'code'];
      if (Object.keys(body).some(k => !allowed.includes(k))) fail();
      const userResponse = await call(`${config.supabaseUrl}/auth/v1/user`, { headers: { apikey: config.anonKey, Authorization: authorization } });
      if (!userResponse.ok) fail();
      const user = await boundedJson(userResponse, 65536);
      // Decode only after Auth validates this exact bearer. SQL also verifies that
      // the session still exists and belongs to this user before every operation.
      const claims = jwtParts(authorization.slice(7)).claims;
      if (!UUID.test(user.id) || claims.sub !== user.id || claims.role !== 'authenticated' || !UUID.test(claims.session_id)) fail();
      const args = { p_owner: user.id, p_session: claims.session_id };
      if (body.action === 'challenge') {
        const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
        const digest = await crypto.subtle.digest('SHA-256', encoder.encode(nonce));
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        const id = await rpc('begin_apple_account_deletion', { ...args, p_nonce_sha256: hash });
        if (!UUID.test(id)) fail();
        return reply({ id, nonce });
      }
      if (!UUID.test(body.requestId) || typeof body.code !== 'string' || body.code.length < 1 || body.code.length > 4096) fail();
      // Atomic claim means concurrent/replayed codes never exchange or revoke twice.
      const challenge = await rpc('claim_apple_account_deletion', { ...args, p_request: body.requestId });
      if (typeof challenge.apple_subject !== 'string' || !/^[a-f0-9]{64}$/.test(challenge.nonce_sha256)) fail();
      const now = Math.floor(Date.now() / 1000);
      const secret = await clientSecret(config, now);
      const exchange = await call(`${APPLE}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: secret, code: body.code, grant_type: 'authorization_code' }) });
      if (!exchange.ok) fail();
      const tokens = await boundedJson(exchange, 65536);
      if (typeof tokens.id_token !== 'string' || typeof tokens.refresh_token !== 'string' || !tokens.refresh_token || tokens.refresh_token.length > 16384) fail();
      const jwks = await call(`${APPLE}/auth/keys`);
      if (!jwks.ok) fail();
      const keys = (await boundedJson(jwks, 65536)).keys;
      if (!Array.isArray(keys) || keys.length > 20) fail();
      await verifyAppleToken(tokens.id_token, keys, challenge.apple_subject, challenge.nonce_sha256, Math.floor(Date.now() / 1000));
      const revoke = await call(`${APPLE}/auth/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: secret, token: tokens.refresh_token, token_type_hint: 'refresh_token' }) });
      // Apple specifies HTTP 200. Timeouts, unexpected responses and uncertainty
      // must not authorize deletion. No provider response is forwarded to clients.
      if (revoke.status !== 200) fail();
      await revoke.body?.cancel();
      const deleted = await rpc('finish_apple_account_deletion', { ...args, p_request: body.requestId, p_confirmation: 'DELETE' });
      if (deleted !== true) fail();
      return reply({ deleted: true });
    } catch {
      return reply({ error: 'apple_deletion_unconfirmed' }, 400);
    }
  };
}
