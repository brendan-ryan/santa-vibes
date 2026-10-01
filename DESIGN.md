# Santa Vibes — Design & Architecture Guide

> This document captures design decisions (made and pending) for the Secret Santa family web app.  
> It serves as both a product spec and a development reference when implementation begins.

---

## 1. Overview

A private web app for family use to manage a Secret Santa gift exchange. It handles:
- Admin-driven pairing generation with exclusion rules
- Per-user wishlist management (with links, descriptions, and images)
- Viewing your matched partner's wishlist
- Anonymous messaging between matched pairs

**Audience:** ~10–30 family members, accessed primarily from mobile browsers.  
**Hosting:** DigitalOcean VPS, custom domain.

---

## 2. Tech Stack

### Decided

| Layer | Choice | Rationale |
|---|---|---|
| Deployment target | Web (browser) | Hosted on VPS at a URL; not a native app store app |
| Hosting | DigitalOcean VPS + Nginx | Already in place; Nginx as reverse proxy |
| Design approach | Mobile-first responsive PWA | Most users on phones; add-to-home-screen experience; desktop supported |
| Frontend framework | Next.js + Tailwind CSS | Web-native, API routes, one deploy; Tailwind for mobile-first styling |
| Backend | Next.js API Routes | Same project, same deploy |
| Database | PostgreSQL | Relational data maps well; reliable on VPS |
| Auth | NextAuth.js (Email provider) | Magic link login — no passwords; one-time link sent to email |
| Email service | Resend | Transactional email for magic links only; free tier sufficient at family scale |
| Image storage | DigitalOcean Spaces | S3-compatible, keeps images off VPS disk |
| Notifications | Web Push (PWA) | Native-feeling push on mobile; no email infrastructure needed |
| Version control | GitHub (private repo) | Source of truth; deploy trigger |
| CI/CD | GitHub Actions + SSH | Push to `main` → SSH into VPS → build → pm2 restart |
| Process manager | PM2 | Keeps Next.js server running; handles restarts on deploy |

### PWA Requirements

For the app to function as a PWA with push notifications:
- `manifest.json` — app name, icons, theme color, `display: standalone`
- Service worker — handles push event subscription and background notification delivery
- HTTPS — required for both PWA installation and Web Push (satisfied by the VPS + Nginx + Let's Encrypt setup)
- Web Push subscription stored per-user in the database (endpoint + keys from the browser's push service)
- Users prompted to install ("Add to Home Screen") and grant notification permission on first login

**Push notification trigger events (v1):**
- Giftee adds or updates wishlist items → notify the giver
- New anonymous message received → notify the recipient

**No email fallback in v1.** Users who decline push permission or don't install the PWA will rely on in-app indicators only.

---

## 3. Features

### 3.1 Admin: Pairing Generation

**Who can do this:** A designated admin user (likely one person per year).

**Inputs:**
- List of participant names/accounts for the current season
- Ineligible pairs list:
  - Couples (permanent, manually managed exclusion)
  - All pairings from prior years (pulled automatically from history — prevents any user from getting the same person too frequently)

**Algorithm:**
- Constraint-based random assignment — find a valid perfect matching where no pair appears in the combined exclusion list
- Can be modeled as a graph problem: participants as nodes, exclusions as forbidden edges; find a valid derangement
- The system looks back **3 years** of pairing history — this prevents patterns like A→B every other year without over-constraining small groups
- If no valid assignment exists (over-constrained by 3-year exclusions), the system should relax year 3 first, then year 2, surfacing a warning noting which constraint was relaxed
- If no valid assignment exists even after relaxation (e.g., too many couple exclusions for the group size), surface a clear error

**Output:**
- Each participant is assigned exactly one gift recipient
- Assignments are stored; each user can only see their own assignment

**Pairing lifecycle:**
- Pairings are generated **once per season** and considered fixed
- Admin can trigger a regeneration via a deliberate action (e.g., a confirmation dialog), but this is an exception, not a normal flow
- Regeneration replaces all previous assignments for the current season; the prior run is not preserved

**Admin visibility of pairings:**
- **Current season:** Admin does *not* see individual pair assignments — only success/failure. This preserves the admin's own surprise.
- **Historical seasons:** Admin *can* view prior years' pairing history via `/admin/exclusions`. This is necessary for managing the exclusion system (e.g. verifying why a constraint was relaxed, auditing the 3-year lookback).

**Open questions:**
- [ ] How are new participants added year over year? (Presumed: admin adds via /admin/users before generating pairings)

---

### 3.2 Authentication & User Management

- Users log in via **magic link** — they enter their email address, receive a one-time login link, and click it to authenticate. No password exists.
- Sessions persist across visits (long-lived session cookie; don't force re-login every time)
- "Forgot password" is a non-issue — users just request a new link

**Account creation:** Admin-only. The admin pre-creates accounts by entering a name + email address. On first visit, the user requests a magic link to their email and lands directly in the app. No credentials to set or remember.

**Password reset:** Not applicable — magic links eliminate this flow entirely.

**Open questions:**
- [ ] Do users have display names separate from their email login? (Presumed yes — a friendly name shown in the UI, set by admin at account creation)

---

### 3.3 Wishlist Management

Each user can build and manage a personal gift wishlist.

**Per item:**
- Title / name (required)
- Written description (optional, freeform)
- Product link / URL (optional)
- One or more images (optional, user-uploaded)
- Priority indicator (optional — "really want this" vs "nice to have")
- Price / estimated amount (optional but encouraged — visible to both the receiver on their own list and the giver; enables running total for giver; see §3.4)

**Behavior:**
- User can add, edit, reorder, and delete their own items
- Items are visible to their Secret Santa partner
- Price is encouraged but not required; the UI should prompt or nudge users to add one without blocking submission
- No maximum number of items — receivers are encouraged to list more than they expect to receive, giving the giver options

---

### 3.4 Partner Wishlist View

- After pairing is generated, each user can view their assigned partner's wishlist
- The recipient's name **is shown** to the gift-giver. The secret is the *giver's* identity — the recipient does not know who their Santa is.
- Read-only view of partner's items

**Giver item tracking:**
- The gift-giver can mark any item as "planning to buy" or "purchased" — this state is **only visible to the giver**, never shown to the recipient
- A running total is displayed to the giver, summing the prices of all items they've marked; unpriced or unmarked items are excluded from the total
- The running total is shown against a **global budget**, set by the admin at the season level (e.g. "$50 budget")
- Receivers are encouraged to list items exceeding the budget to give givers flexibility in how they reach it
- The budget is informational, not enforced — givers can exceed or underspend it

---

### 3.5 Anonymous Messaging

Matched pairs can exchange anonymous messages without revealing who the gift-giver is.

**Types:**
- **Canned messages** (sender picks from a list): protects identity since wording is standardized
  - Examples: "You haven't added any wishlist items yet!", "Can you add more details to one of your items?", "I found your gift — you're going to love it! 🎁"
- **Free-text messages** (optional): user types their own (max 255 characters); identity concealed since messages are marked as "from your Secret Santa" or "from your giftee"

**Direction:** Two-way — both the giver and the recipient can initiate messages. The giver's identity remains hidden from the recipient; the recipient's identity is visible to the giver (see §3.4).

**Delivery:**
- In-app notification / message inbox
- Web Push notifications (via PWA service worker) for:
  - New message received from your match
  - Your giftee has added or updated wishlist items
- Notification content must not reveal the sender's identity in the push preview text

**Message history:**
- Message threads are wiped at the end of each season (when a new season is started or on an explicit admin reset)
- Pairing history is **preserved for 3 years** to power the exclusion algorithm (see §3.1)

**Open questions:**
- [ ] Should there be a character limit on free-text messages?

---

## 4. Data Model (Conceptual)

```
User
  id, name, display_name, email, role (admin | member), created_at
  -- no password_hash; authentication is via magic link only

PushSubscription
  id, user_id → User, endpoint, p256dh_key, auth_key, created_at
  -- Web Push subscription from the browser; one per user/device

Season
  id, year (unique), budget (nullable), is_test (boolean), generated_at, reset_at (null until wiped)
  -- budget is the global spending target for the season, set by admin
  -- is_test: when true, pairing generation skips all exclusion rules; admin can wipe the season

Pairing
  id, season_id → Season, giver_id → User, receiver_id → User
  -- Preserved for real seasons; test season pairings are deleted on wipe
  -- Algorithm excludes pairs from the 3 most recent prior non-test seasons

IneligiblePair  -- couples only; historical pairings are derived from the Pairing table
  id, user_a_id → User, user_b_id → User, reason (couple), created_at

WishlistItem
  id, user_id → User, title, description, url, price (nullable), priority,
  display_order, created_at, updated_at

WishlistImage
  id, item_id → WishlistItem, storage_url, display_order

GiverSelection  -- giver's private tracking; never exposed to the receiver
  id, pairing_id → Pairing, item_id → WishlistItem,
  status (planning | purchased), created_at

Message
  id, pairing_id → Pairing, sender_role (giver | receiver),
  body, is_canned, sent_at, read_at
  -- Wiped when season resets; Pairing rows themselves are kept
```

---

## 5. Page / Screen Map

```
/ (root)
  → /login                      Login screen
  → /dashboard                  Home after login
      → /wishlist                My wishlist (add/edit/delete items)
      → /partner                 My partner's wishlist (read-only)
      → /messages                Inbox + compose anonymous message
  → /admin                      Admin-only section
      → /admin/users             Manage participants
      → /admin/pairings          Generate / view pairings
      → /admin/exclusions        Manage ineligible pairs
```

---

## 6. CI/CD Pipeline

### Branch Strategy
- `main` — always production-ready; push to this branch triggers a deploy
- Feature branches — all development work; merged to `main` via pull request

### Deploy Flow
```
Developer pushes to main (or PR is merged)
  → GitHub Actions workflow triggers
  → SSH into DigitalOcean VPS
  → cd /var/www/santa-vibes && git pull origin main
  → npm ci                         # clean install from lockfile
  → npm run build                  # Next.js production build
  → pm2 restart santa-vibes        # zero-config restart; PM2 keeps app alive
```

### GitHub Actions Secrets Required
| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH user (e.g. `deploy` or `root`) |
| `VPS_SSH_KEY` | Private SSH key (corresponding public key added to VPS `authorized_keys`) |

### Notes
- Build runs on the VPS itself (not in the Actions runner) — keeps the workflow simple and avoids artifact transfer
- A brief restart window (~5–10s) is acceptable for a family app with low concurrent usage
- PM2 is configured to auto-start on VPS reboot (`pm2 startup`), so the app survives server restarts
- The workflow file lives at `.github/workflows/deploy.yml` in the repo

---

## 7. Non-Functional Requirements

| Concern | Decision |
|---|---|
| Mobile-first | Yes — design for small screens first, expand for desktop |
| Auth security | Magic links via NextAuth.js; no passwords stored; session cookie after link click |
| Data sensitivity | Low: no payment info, minimal PII |
| Availability | Best-effort on personal VPS; no SLA required |
| Multi-year support | Yes — system should persist across years, with new pairings each season |
| PWA / installability | Yes — manifest + service worker; users add to home screen for native-like experience |
| Push notifications | Web Push only (v1); no email fallback |

---

## 8. Open Questions Log

Collected from sections above:

**Pairing / Admin**
- [x] ~~Does the admin see all pairs or just a "success" confirmation?~~ Current season: success/failure only. Historical seasons: fully visible via /admin/exclusions for exclusion management.
- [x] ~~Can pairings be regenerated?~~ Fixed once generated; admin can force-regenerate via explicit confirmation, which replaces the current season's assignments.
- [x] ~~How many years back does the exclusion look?~~ 3 years; relaxes oldest year first if over-constrained.
- [ ] How are new participants added year over year? (Presumed: admin adds via /admin/users before generating)

**Auth / Users**
- [x] ~~Self-registration with invite link, or admin-created accounts only?~~ Admin creates all accounts.
- [x] ~~Auth mechanism and password reset?~~ Magic links via NextAuth.js Email provider + Resend. No passwords — reset flow is a non-issue.

**Wishlist**
- [x] ~~Can a giver mark items?~~ Yes — "planning to buy" / "purchased"; hidden from receiver. Running total shown against global budget.
- [x] ~~Price field visibility?~~ Visible to receiver on their own list and to giver; encouraged but not required.
- [x] ~~Budget scope?~~ Global per season, set by admin. Informational only — not enforced.
- [x] ~~Max items?~~ No limit; receivers encouraged to list more than the budget to give givers options.

**Partner View**
- [x] ~~Is the recipient's name shown to the giver?~~ Yes — the giver sees the recipient's name; the secret is the giver's identity.

**Messaging**
- [x] ~~One-way or two-way?~~ Two-way — both giver and recipient can initiate.
- [x] ~~Message history retention?~~ Wiped at season reset; Pairing rows kept for 3 years for the exclusion algorithm.
- [x] ~~Notifications?~~ Web Push via PWA. Triggers: new message received, giftee updates wishlist.
- [x] ~~Character limit on free-text messages?~~ 255 characters.

---

## 9. Out of Scope (v1)

- Native iOS / Android app
- Payment processing
- Public sign-up
- Group gift coordination
- Email notifications (may revisit in a later version)
- Native iOS / Android app store distribution
