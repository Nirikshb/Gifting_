# Google Login — Step 1 decision record

Status: **Frozen** (implementation not started).  
Scope: authentication only. **Order ownership and customer-linked orders are out of scope** until the commerce flow is ready.

This document is the source of truth for Steps 2–8. If implementation diverges, update this file in the same change set.

---

## Locked decisions

| Topic | Decision |
| ----- | -------- |
| Google identity | Identify customers by Google’s verified **`sub`**. Unique in the database when present. Email is an attribute only. |
| Session | Opaque random token; **hash stored in PostgreSQL** (not the raw token). Server-side **expiry** and **invalidation** on logout. **Rotate** session token on each successful sign-in. |
| Cookie | **`HttpOnly`**. **`Secure`** in production. **`SameSite`** chosen from deployment layout (see below). No auth tokens in `localStorage` or `sessionStorage`. |
| Customer profile (API) | Expose only **`id`**, **`email`**, **`displayName`** to the frontend. Never return Google ID tokens, session tokens, or session row internals. |
| API envelope | Keep **`TransformResponseInterceptor`** and **`GlobalExceptionFilter`** behavior. Auth routes return plain handler payloads like existing controllers. |
| Guest checkout | **Unchanged.** No automatic account creation from checkout. **No order linking** by email on login. |
| Missing Client ID | Backend and frontend **may start** without `GOOGLE_CLIENT_ID`. **`POST /auth/google`** returns a **clear configuration error** (not a generic 500). Sign-in UI may hide or disable the button when the public Client ID is unset. |

---

## API contract

Base path: **`/auth`** (no global API prefix; matches `products` and `orders`).

### `POST /auth/google`

**Purpose:** Verify a Google ID token, find or create a customer by `sub`, create a session, set session cookie.

**Request**

- `Content-Type: application/json`
- Body:

```json
{
  "credential": "<Google ID token JWT>"
}
```

- Validated with `class-validator` (non-empty string, reasonable max length). Reject unknown properties (`ValidationPipe` whitelist).

**Success:** `200`

- Body (before interceptor): customer object `{ id, email, displayName }`.
- After interceptor: `{ success: true, data: { id, email, displayName } }`.
- Response header: **`Set-Cookie`** with new session cookie (session rotation).

**Failure**

| Condition | HTTP | Client message (generic where noted) |
| --------- | ---- | ------------------------------------ |
| DTO validation | `400` | Validation message from filter |
| Invalid / expired / wrong audience token | `401` | Generic sign-in failure (no JWT details) |
| Google sign-in disabled (no Client ID) | **`503`** | Explicit: Google sign-in is not configured |
| Unexpected server error | `500` | Internal server error (existing filter) |

**Server rules**

- Verify token with **`google-auth-library`** (no manual JWT crypto).
- Check signature, expiry, issuer, and **audience** against configured **`GOOGLE_CLIENT_ID`**.
- Trust **`sub`**, **`email`**, and name claims **only from the verified token**.
- Concurrent first-time sign-ins for the same `sub`: rely on DB **unique constraint** on `google_sub` and handle conflict safely (one customer wins).

### `GET /auth/me`

**Purpose:** Return the current customer from the session cookie.

**Request:** Session cookie sent by the browser (`credentials: 'include'` from the frontend when cross-origin).

**Success:** `200` → `{ success: true, data: { id, email, displayName } }`.

**Failure:** `401` if cookie missing, unknown, expired, or invalidated.

Must not return session id, token hash, or Google tokens.

### `POST /auth/logout`

**Purpose:** Invalidate the current session server-side and clear the cookie.

**Success:** `200` → `{ success: true, data: { loggedOut: true } }` (exact shape may use a minimal object; keep consistent once implemented).

**Idempotent:** Safe when already logged out; still clear cookie if present; no error for unknown session.

---

## Session policy

### Token generation

- Cryptographically random opaque string (e.g. 32 bytes, base64url or hex).
- Store **only a hash** in PostgreSQL (e.g. SHA-256 of the token; pepper with **`SESSION_SECRET`** if the implementation uses one secret for both signing/peppering—document in env example).

### Lifetime

- **Absolute expiry: 7 days** from session creation (documented default).
- Enforce expiry on every authenticated request and on `/auth/me`.
- **No “log out everywhere”** in v1; logout affects **current session only**.

### Rotation

- On successful **`POST /auth/google`**, always issue a **new** session and cookie (invalidate any previous session for that customer optional for v1; minimum: new row + new cookie).

### Cookie

| Attribute | Value |
| --------- | ----- |
| **Name** | **`gp_session`** (dedicated; avoids generic `session` collisions) |
| **Path** | `/` |
| **Max-Age / Expires** | Aligned with 7-day session expiry |
| **HttpOnly** | `true` |
| **Secure** | `true` in production; `false` only for local HTTP if required |
| **SameSite** | See deployment table below |
| **Domain** | Omit (host-only) unless production requires otherwise; do **not** use `__Host-` prefix unless all `__Host-` requirements are met |

### SameSite and deployment

| Layout | Example | Recommended cookie |
| ------ | ------- | -------------------- |
| Same site (reverse proxy serves API + app under one registrable domain) | `https://shop.example.com/api` + `https://shop.example.com` | `SameSite=Lax` or `Strict` (prefer **Lax** for top-level navigations) |
| Cross-origin (browser sees different sites) | Frontend `https://app.example.com`, API `https://api.example.com` | `SameSite=None; Secure` **and** strict CORS + CSRF for state-changing requests |

Exact origins come from configuration in Step 2—not hardcoded in code.

---

## Google Identity Services (frontend)

### Mode (frozen)

- Use the **official GIS JavaScript API** and **Sign In With Google button** (or equivalent GIS-rendered button).
- **`callback`** receives **`credential`** (ID token JWT).
- Frontend sends that string to **`POST /auth/google`** via the existing **`api.ts`** pattern (extended with **`credentials: 'include'`** once cookies are used).
- **Do not** build a custom OAuth popup or trust client-supplied email/name/id without server verification.

### Public configuration

- Frontend: **`NEXT_PUBLIC_GOOGLE_CLIENT_ID`** (GIS initialization only).
- Backend: **`GOOGLE_CLIENT_ID`** (token audience verification).
- Values must match the same Google OAuth Web client when sign-in is enabled.

### CSRF (frozen intent)

Integration: GIS **credential callback** → same-origin or cross-origin **`fetch` POST** to NestJS (not Google’s server-side POST redirect handler unless we switch modes later).

Protect **`POST /auth/google`** and **`POST /auth/logout`**:

1. **CORS:** Allow **`credentials: true`** only for configured frontend origin(s)—never `*`.
2. **Origin / Referer:** Reject state-changing auth requests whose origin is not in the allowlist.
3. **CSRF token (double-submit):** Issue a non-HttpOnly CSRF cookie (or readable token from a dedicated **`GET /auth/csrf`**) and require matching header (e.g. **`X-CSRF-Token`**) on **`POST /auth/google`** and **`POST /auth/logout`**. SameSite rules must allow the frontend to read the CSRF cookie when using cross-site cookies (`SameSite=None` on session cookie may require **`SameSite=Lax`** on CSRF cookie and careful origin checks—implement in Step 7 per actual URLs).

**`GET /auth/me`** is read-only; CSRF not required (cookie still sent only from allowed origins via CORS).

If Google documents additional CSRF requirements for a specific GIS option we enable, satisfy those without adding a second overlapping framework.

---

## Local development ports

**Current repo state:** Backend defaults to **`PORT ?? 3000`** (`main.ts`). Frontend **`next dev`** defaults to **3000**. **`next.config.mjs`** does not override ports. No committed `.env.example` yet.

**Policy**

- Before browser auth testing, run frontend and backend on **different ports** (e.g. frontend **3000**, backend **3001** via `PORT=3001` in backend `.env`).
- Set **`NEXT_PUBLIC_API_URL`** to the backend origin (e.g. `http://localhost:3001`).
- **Do not** change default ports in `package.json` or framework config unless we explicitly standardize dev scripts in Step 2; use **environment variables** first.

---

## Environment variables (names only; values in Step 2)

| Variable | Where | Purpose |
| -------- | ----- | ------- |
| `GOOGLE_CLIENT_ID` | Backend | ID token audience verification |
| `SESSION_SECRET` | Backend | Session token hashing / crypto material |
| `FRONTEND_ORIGIN` | Backend | Credentialed CORS + origin checks (required at startup when `GOOGLE_CLIENT_ID` is set) |
| `SESSION_TTL_DAYS` | Backend | Optional session lifetime override (default **7**) |
| `PORT` | Backend | Listen port |
| `NEXT_PUBLIC_API_URL` | Frontend | API base URL (existing) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Frontend | GIS button (existing pattern for public env) |
| `NODE_ENV` | Backend | `Secure` cookie and production behavior |

Existing **`DB_*`** variables unchanged.

---

## Explicitly out of scope (v1)

- Email/password auth, other OAuth providers, MFA, admin auth, roles.
- **`orders.customer_id`**, order history, or merging guest orders.
- Cart changes as a side effect of login.
- Token refresh endpoints, “sessions management” UI, log out everywhere.
- **`@nestjs/authentication`** / Passport unless a later review proves necessary.
- Automated test suites for auth (manual verification per project preference).

---

## Recommended implementation order (unchanged)

1. ~~Freeze API contract and session policy~~ (**this document**).
2. Environment examples and configuration validation.
3. Customer and session entities + migrations.
4. Google verification + session creation (`POST /auth/google`).
5. `GET /auth/me` + `POST /auth/logout` + session guard for future protected routes.
6. Frontend GIS button + `/auth/me` restoration + layout account UI.
7. CORS, cookie attributes, CSRF for POST auth routes.
8. Manual verification with real Google Cloud client ID and deployed origins.

---

## Step 2 verification

- [x] `backend/.env.example` and `frontend/.env.example` document placeholders (no secrets).
- [x] Backend validates `DB_*` at startup; validates `SESSION_SECRET` and `FRONTEND_ORIGIN` only when `GOOGLE_CLIENT_ID` is set.
- [x] App starts with `GOOGLE_CLIENT_ID` unset.
- [x] `auth-configuration.ts` exposes `isGoogleSignInConfigured` and `GOOGLE_SIGN_IN_NOT_CONFIGURED_MESSAGE` for Step 4 `503` responses.
- [x] No auth routes, entities, migrations, cookies, CORS, or CSRF in Step 2.

---

## Step 1 verification

- [x] Decisions recorded and aligned with discovery report.
- [x] API paths, payloads, and status codes defined.
- [x] Session cookie name (`gp_session`), 7-day expiry, and hashing approach defined.
- [x] GIS callback → NestJS verification flow defined.
- [x] CSRF/CORS intent defined for implementation in Step 7.
- [x] Order ownership excluded.
- [x] No application code or dependency changes in this step.
