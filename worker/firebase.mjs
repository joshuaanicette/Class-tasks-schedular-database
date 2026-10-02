// Firebase REST adapters for Workers. Credentials stay in encrypted Worker secrets.
const encoder = new TextEncoder();
const scope = [
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/firebase.messaging',
].join(' ');
const tokenCache = new WeakMap();

export function failure(code, status = 503) {
  return Object.assign(new Error(code), { code, status });
}

async function request(fetcher, url, options = {}) {
  return fetcher(url, { ...options, signal: AbortSignal.timeout(10000) });
}

function base64url(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : new Uint8Array(value);
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function accessToken(env, fetcher = fetch) {
  const cached = tokenCache.get(env);
  if (cached?.expires > Date.now() + 60000) return cached.token;
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  if (account.project_id !== env.FIREBASE_PROJECT_ID || !account.client_email || !account.private_key)
    throw failure('backend-not-configured');
  const pem = account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey(
    'pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({
    iss: account.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned));
  const response = await request(fetcher, 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${base64url(signature)}` }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw failure('backend-credentials');
  tokenCache.set(env, { token: data.access_token, expires: Date.now() + Number(data.expires_in || 3600) * 1000 });
  return data.access_token;
}

export async function verifyUser(idToken, env, fetcher = fetch) {
  // Firebase validates the ID token against the project selected by this API key.
  // Never accept a UID from the request body or decode an unverified JWT as identity.
  const response = await request(fetcher,
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
    });
  const data = await response.json();
  if (response.status === 429 || response.status >= 500) throw failure('backend-unavailable');
  if (response.status === 403 || /API_KEY|API key/.test(data.error?.message || ''))
    throw failure('backend-credentials');
  const user = data.users?.[0];
  if (!response.ok || !user?.localId || user.disabled) throw failure('unauthenticated', 401);
  // The lookup above is the signature/expiry authority. Also bind the verified
  // token to this Worker's project, guarding against a misconfigured API key.
  try {
    const encoded = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))));
    if (claims.aud !== env.FIREBASE_PROJECT_ID ||
        claims.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}` ||
        claims.sub !== user.localId) throw new Error();
  } catch { throw failure('unauthenticated', 401); }
  return user.localId;
}

export function database(env, token, fetcher = fetch) {
  async function dbRequest(path, options = {}, query = {}) {
    const url = new URL(`${env.FIREBASE_DATABASE_URL.replace(/\/$/, '')}/${path}.json`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, JSON.stringify(value));
    return request(fetcher, url.href, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
    });
  }
  return {
    async get(path, query) {
      const response = await dbRequest(path, {}, query);
      if (!response.ok) throw failure('database-unavailable');
      return response.json();
    },
    ref(path) {
      return {
        // RTDB ETags provide compare-and-swap, including deletes, without the Admin SDK.
        // Bounded conflicts retry next minute / on the next user request.
        async transaction(update) {
          for (let attempt = 0; attempt < 2; attempt++) {
            const current = await dbRequest(path, { headers: { 'X-Firebase-ETag': 'true' } });
            if (!current.ok) throw failure('database-unavailable');
            const value = update(await current.json());
            if (value === undefined) return { committed: false };
            const etag = current.headers.get('ETag');
            if (!etag) throw failure('database-unavailable');
            const saved = await dbRequest(path, {
              method: 'PUT', headers: { 'If-Match': etag }, body: JSON.stringify(value),
            });
            await saved.text(); // Release the connection before another subrequest.
            if (saved.status === 412) continue;
            if (!saved.ok) throw failure('database-unavailable');
            return { committed: true };
          }
          throw failure('registration-busy', 409);
        },
      };
    },
  };
}

export async function sendMessage(message, env, token, fetcher = fetch) {
  // Admin SDK camelCase becomes snake_case on the FCM HTTP v1 wire format.
  const { fcmOptions, ...webpush } = message.webpush;
  const response = await request(fetcher,
    `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { ...message, webpush: { ...webpush, fcm_options: fcmOptions } } }),
    });
  const data = await response.json();
  if (!response.ok) {
    const expired = data.error?.details?.some((detail) =>
      detail['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' && detail.errorCode === 'UNREGISTERED');
    // Generic INVALID_ARGUMENT can be a payload/configuration bug: don't delete a valid device.
    throw failure(expired ? 'messaging/registration-token-not-registered' : 'messaging-unavailable');
  }
  return data.name;
}
