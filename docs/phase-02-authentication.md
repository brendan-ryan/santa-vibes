# Phase 2 — Authentication

Magic link authentication using NextAuth.js v5 (Auth.js), Prisma adapter, and Resend for email delivery.

---

## What was built

- **Login page** — email form that sends a magic link; transitions to a confirmation state in-place
- **Verify page** — static confirmation shown after NextAuth's own redirect flow
- **Auth configuration** — NextAuth v5 wired to PostgreSQL via PrismaAdapter
- **Route protection** — proxy middleware redirects unauthenticated users and non-admins
- **Dashboard placeholder** — server component that reads session and shows a welcome message
- **Prisma migration** — added `emailVerified` and `image` fields to the `User` model

---

## File map

| File | Role |
|---|---|
| `src/lib/auth.ts` | NextAuth configuration: provider, adapter, callbacks, email template |
| `src/lib/db.ts` | Prisma client singleton (shared across the app) |
| `src/types/next-auth.d.ts` | TypeScript augmentation to add `id` and `role` to the session |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all route handler (GET + POST) |
| `src/proxy.ts` | Route protection middleware (Next.js 16 name for middleware.ts) |
| `src/components/session-provider.tsx` | Thin client wrapper re-exporting `SessionProvider` from next-auth/react |
| `src/app/login/page.tsx` | Login page — client component with email form and submitted state |
| `src/app/login/verify/page.tsx` | "Check your email" confirmation page (static) |
| `src/app/dashboard/page.tsx` | Dashboard placeholder — server component, session-aware |
| `src/app/page.tsx` | Root redirect to `/dashboard` |
| `src/app/layout.tsx` | Root layout — wraps children in `<SessionProvider>` |

---

## Auth flow

```
User visits any protected route
  → proxy.ts redirects to /login

User enters email → clicks "Send me a magic link"
  → signIn("resend", { email }) called client-side (next-auth/react)
  → POST /api/auth/signin/resend
  → NextAuth creates a VerificationToken in the database
  → sendVerificationRequest is called server-side

sendVerificationRequest:
  1. Checks if the email belongs to an admin-created user — silently skips unknown emails
  2. In development (or when RESEND_API_KEY is empty): logs the magic link to PM2/console
  3. In production: sends a branded HTML email via Resend

User clicks magic link
  → GET /api/auth/callback/resend?token=...
  → NextAuth verifies the token, creates a Session in the database
  → Sets a session cookie, redirects to /dashboard

Subsequent requests
  → proxy.ts reads req.auth (the session)
  → Lets authenticated requests through
  → Redirects /admin/* for non-ADMIN role users to /dashboard
```

---

## Key decisions

**NextAuth v5 (Auth.js) instead of v4**
NextAuth v5 is the current major version. The API differs from v4: `auth()` is a server function (not `getServerSession`), configuration lives in `src/lib/auth.ts` (not `pages/api/auth/[...nextauth].ts`), and the file convention changed from `middleware.ts` to `proxy.ts` in Next.js 16.

**Database sessions (not JWT)**
Using the PrismaAdapter means NextAuth stores sessions in the `Session` table rather than encoding them in a JWT cookie. This allows session revocation (deleting the row) and keeps sensitive data server-side. The trade-off is a database lookup on each authenticated request, which is acceptable for a low-traffic family app.

**Admin-created accounts only**
`sendVerificationRequest` checks whether the email belongs to an existing user before sending the link. Unknown emails are silently skipped (no error shown to the submitter — standard security practice to avoid revealing whether an address is registered). This enforces the design decision that only the admin can create accounts.

**Dev mode magic link logging**
When `NODE_ENV !== "production"` or `RESEND_API_KEY` is unset, the magic link is printed to the server console/PM2 logs instead of being emailed. This allows local testing without a Resend account.

**`emailVerified` and `image` added to User**
The Prisma adapter calls `updateUser` when a user signs in via magic link (to record `emailVerified`). It also expects `image` to exist on the model. Both fields were added as nullable columns — `image` will always be null in this app (no OAuth), and `emailVerified` is set automatically by NextAuth on first sign-in.

**`AUTH_TRUST_HOST=true` on the VPS**
NextAuth v5 rejects requests where the `Host` header doesn't match a trusted origin. Behind Nginx, the host header is `santa.brendanryan.dev` (forwarded by the proxy). Adding `AUTH_TRUST_HOST=true` to `.env` on the VPS tells NextAuth to trust the host header rather than requiring explicit `AUTH_URL` configuration.

**SessionProvider in root layout**
`SessionProvider` (from `next-auth/react`) provides the session to client components via React context. Server components use `auth()` directly instead. The provider is re-exported from `src/components/session-provider.tsx` as a `"use client"` boundary since the root layout itself is a server component.

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `AUTH_SECRET` | `.env.local` + VPS `.env` | Signs session cookies and tokens |
| `AUTH_TRUST_HOST` | VPS `.env` only | Trusts the Nginx-forwarded host header |
| `NEXTAUTH_URL` | `.env.local` | Base URL (used by NextAuth for building callback URLs locally) |
| `RESEND_API_KEY` | VPS `.env` (deferred) | Resend API key — empty = dev mode, magic link logs to console |
| `RESEND_FROM_EMAIL` | `.env.local` + VPS `.env` | Sender address for magic link emails |

---

## PM2 process management note

The app runs under the `deploy` user's PM2 daemon (`/home/deploy/.pm2`), not root's. All PM2 commands on the VPS should be prefixed with `sudo -u deploy`. The deploy workflow SSHes as `deploy`, so its `pm2` commands hit the right daemon automatically.
