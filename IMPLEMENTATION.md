# Santa Vibes — Implementation Plan

> Step-by-step build guide. Items marked **[YOU]** require action on your end (VPS, GitHub, third-party accounts). All others are code tasks.

---

## Phase 0 — External Setup & Infrastructure

Everything in this phase must be completed before any code is deployed.

### 0.1 Domain & DNS [YOU]

- Subdomain: `santa.brendanryan.dev`
- Add an A record pointing it to your DigitalOcean VPS IP (if not already done)

### 0.2 GitHub [YOU]

- Create a new **private** GitHub repository named `santa-vibes`
- Do not initialize with a README (the project scaffold will do this)

### 0.3 VPS — System Dependencies [YOU]

SSH into your VPS and install the following if not already present:

```bash
# Node.js (LTS — v20+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (global process manager)
sudo npm install -g pm2

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
```

### 0.4 VPS — PostgreSQL Setup [YOU]

```bash
sudo -u postgres psql

CREATE USER santavibes WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE santavibes OWNER santavibes;
\q
```

Note the connection string for your `.env`:
```
postgresql://santavibes:choose-a-strong-password@localhost:5432/santavibes
```

### 0.5 VPS — Deploy User & SSH Key [YOU]

Create a dedicated deploy user (or reuse an existing non-root user):

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy   # only if deploy needs sudo for pm2 startup
```

Generate an SSH key pair **on your local machine** for GitHub Actions:

```bash
ssh-keygen -t ed25519 -C "github-actions-santa-vibes" -f ~/.ssh/santa_vibes_deploy
```

Copy the public key to the VPS:

```bash
ssh-copy-id -i ~/.ssh/santa_vibes_deploy.pub deploy@YOUR_VPS_IP
```

### 0.6 VPS — App Directory [YOU]

```bash
sudo mkdir -p /var/www/santa-vibes
sudo chown deploy:deploy /var/www/santa-vibes
```

### 0.7 VPS — Nginx Server Block [YOU]

Create `/etc/nginx/sites-available/santa-vibes`:

```nginx
server {
    listen 80;
    server_name santa.brendanryan.dev;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase for image uploads
    client_max_body_size 10M;
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/santa-vibes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 0.8 VPS — SSL via Let's Encrypt [YOU]

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d santa.brendanryan.dev
```

Certbot will auto-modify the Nginx config to handle HTTPS and set up auto-renewal.

### 0.9 GitHub Actions Secrets [YOU]

In the GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret name | Value |
|---|---|
| `VPS_HOST` | Your VPS IP or hostname |
| `VPS_USER` | `deploy` (or whichever user you created) |
| `VPS_SSH_KEY` | Contents of `~/.ssh/santa_vibes_deploy` (the **private** key) |

### 0.10 DigitalOcean Spaces [YOU]

- In the DigitalOcean control panel, create a new Space (e.g. `santa-vibes-media`)
- Choose the region closest to your VPS
- Generate a Spaces access key: API → Spaces Keys → Generate New Key
- Note the **Access Key**, **Secret Key**, **Space name**, and **endpoint** (e.g. `nyc3.digitaloceanspaces.com`)

### 0.11 Resend [YOU]

- Create an account at resend.com
- Add and verify your domain (used as the magic link sender address)
- Generate an API key
- Note the API key and your verified sender address (e.g. `noreply@yourdomain.com`)

---

## Phase 1 — Project Scaffold

*All code tasks.*

### 1.1 Initialize Next.js App

```bash
npx create-next-app@latest santa-vibes \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd santa-vibes
```

### 1.2 Install Core Dependencies

```bash
# Database ORM
npm install prisma @prisma/client

# Auth
npm install next-auth@beta @auth/prisma-adapter

# Email (magic links)
npm install resend

# Image uploads (S3-compatible)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Web Push
npm install web-push
npm install -D @types/web-push

# PWA
npm install next-pwa

# Utilities
npm install zod react-hook-form @hookform/resolvers
```

### 1.3 Initialize Prisma

```bash
npx prisma init
```

Update `DATABASE_URL` in `.env` with the PostgreSQL connection string from step 0.4.

### 1.4 Environment Variables

Create `.env.local` (never committed):

```env
# Database
DATABASE_URL="postgresql://santavibes:password@localhost:5432/santavibes"

# NextAuth
NEXTAUTH_URL="https://santa.brendanryan.dev"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# Resend (magic links)
RESEND_API_KEY=""
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# DigitalOcean Spaces
DO_SPACES_KEY=""
DO_SPACES_SECRET=""
DO_SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_SPACES_BUCKET="santa-vibes-media"
DO_SPACES_CDN_ENDPOINT="https://santa-vibes-media.nyc3.cdn.digitaloceanspaces.com"

# Web Push (generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:your@email.com"
```

Add `.env.local` and `.env` (except `DATABASE_URL` placeholder) to `.gitignore`.

### 1.5 Prisma Schema

Write `prisma/schema.prisma` based on the data model from the design doc:

```prisma
model User {
  id              String    @id @default(cuid())
  name            String
  displayName     String?
  email           String    @unique
  role            Role      @default(MEMBER)
  createdAt       DateTime  @default(now())

  pushSubscriptions PushSubscription[]
  wishlistItems     WishlistItem[]
  givingPairings    Pairing[]  @relation("giver")
  receivingPairings Pairing[]  @relation("receiver")
  ineligiblePairsA  IneligiblePair[] @relation("userA")
  ineligiblePairsB  IneligiblePair[] @relation("userB")
}

enum Role { ADMIN MEMBER }

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dhKey String
  authKey   String
  createdAt DateTime @default(now())
}

model Season {
  id          String    @id @default(cuid())
  year        Int       @unique
  budget      Decimal?
  generatedAt DateTime?
  resetAt     DateTime?
  pairings    Pairing[]
}

model Pairing {
  id         String   @id @default(cuid())
  seasonId   String
  season     Season   @relation(fields: [seasonId], references: [id])
  giverId    String
  giver      User     @relation("giver", fields: [giverId], references: [id])
  receiverId String
  receiver   User     @relation("receiver", fields: [receiverId], references: [id])

  selections GiverSelection[]
  messages   Message[]

  @@unique([seasonId, giverId])
  @@unique([seasonId, receiverId])
}

model IneligiblePair {
  id        String   @id @default(cuid())
  userAId   String
  userA     User     @relation("userA", fields: [userAId], references: [id])
  userBId   String
  userB     User     @relation("userB", fields: [userBId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userAId, userBId])
}

model WishlistItem {
  id           String         @id @default(cuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String
  description  String?
  url          String?
  price        Decimal?
  priority     Priority       @default(NORMAL)
  displayOrder Int            @default(0)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  images     WishlistImage[]
  selections GiverSelection[]
}

enum Priority { HIGH NORMAL LOW }

model WishlistImage {
  id           String       @id @default(cuid())
  itemId       String
  item         WishlistItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  storageUrl   String
  displayOrder Int          @default(0)
}

model GiverSelection {
  id        String          @id @default(cuid())
  pairingId String
  pairing   Pairing         @relation(fields: [pairingId], references: [id])
  itemId    String
  item      WishlistItem    @relation(fields: [itemId], references: [id])
  status    SelectionStatus @default(PLANNING)
  createdAt DateTime        @default(now())

  @@unique([pairingId, itemId])
}

enum SelectionStatus { PLANNING PURCHASED }

model Message {
  id         String      @id @default(cuid())
  pairingId  String
  pairing    Pairing     @relation(fields: [pairingId], references: [id])
  senderRole SenderRole
  body       String      @db.VarChar(255)
  isCanned   Boolean     @default(false)
  sentAt     DateTime    @default(now())
  readAt     DateTime?
}

enum SenderRole { GIVER RECEIVER }
```

Run the first migration:

```bash
npx prisma migrate dev --name init
```

### 1.6 Git & GitHub Remote

```bash
git init
git add .
git commit -m "Initial scaffold"
git remote add origin git@github.com:YOUR_USERNAME/santa-vibes.git
git push -u origin main
```

### 1.7 GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/santa-vibes
            git pull origin main
            npm ci
            npx prisma migrate deploy
            npm run build
            pm2 restart santa-vibes || pm2 start npm --name santa-vibes -- start
```

### 1.8 PM2 Config [YOU — after first deploy]

After the first successful deploy, run on the VPS:

```bash
pm2 startup   # follow the printed instruction to enable auto-start
pm2 save
```

### 1.9 PWA Manifest & Service Worker

Configure `next-pwa` in `next.config.ts` and create `public/manifest.json`:

```json
{
  "name": "Santa Vibes",
  "short_name": "Santa Vibes",
  "description": "Family Secret Santa manager",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#b91c1c",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add app icons (192×192 and 512×512) to `public/`.

---

## Phase 2 — Authentication

### 2.1 NextAuth Configuration

- Configure NextAuth with the Prisma adapter and Resend email provider
- Magic link email template (simple, branded)
- Session strategy: JWT with long expiry (30 days — family app, low security risk)

### 2.2 Route Protection Middleware

- `middleware.ts` at project root: redirect unauthenticated users to `/login`
- Admin-only routes (`/admin/*`) redirect non-admin users to `/dashboard`

### 2.3 Login Page

- Single email input field
- "Send me a link" button
- Confirmation state ("Check your email")
- Mobile-optimized layout

---

## Phase 3 — Admin: User Management

**Route:** `/admin/users`

### 3.1 User List View
- Table/list of all users: name, display name, email, role
- Inline edit and delete actions

### 3.2 Create User Form
- Fields: name, display name, email, role (member/admin)
- On save: creates User record; user receives a magic link on first login attempt

### 3.3 Edit / Delete User
- Edit name, display name, email, role
- Delete removes user and cascades to their wishlist items (pairings are soft-preserved for history)

---

## Phase 4 — Admin: Season & Pairing

### 4.1 Season Management

**Route:** `/admin/pairings`

- Create a new season for the current year
- Set the global gift budget (optional)
- View current season status (pairings generated / not yet)

### 4.2 Pairing Generation Algorithm

Server-side function `generatePairings(seasonId)`:

1. Fetch all active users
2. Fetch `IneligiblePair` records (couples)
3. Fetch `Pairing` records from the 3 most recent prior seasons (historical exclusions)
4. Build a combined exclusion set (ordered pairs — A→B is distinct from B→A)
5. Shuffle the participant list and attempt to assign givers to receivers such that no assignment appears in the exclusion set and no one is assigned to themselves
6. If a valid assignment is not found within N attempts, relax the oldest year's historical exclusions and retry; surface a warning
7. If still no valid assignment (couple exclusions only), return a clear error
8. Write `Pairing` rows to the database atomically (transaction)

### 4.3 Generate Pairings UI

- "Generate Pairings" button with a confirmation dialog
- Success state: "Pairings generated for [year]. Your participants have been matched."
- Error state: describes which constraint was relaxed or why generation failed
- "Regenerate" button (behind a second confirmation: "This will reassign all pairs. Are you sure?")

### 4.4 Exclusion Management

**Route:** `/admin/exclusions`

- List of couple exclusions (add/remove pairs)
- Historical pairing table: season-by-season view of who gave to whom (all prior seasons visible to admin)

---

## Phase 5 — Wishlist Management

**Route:** `/wishlist`

### 5.1 Wishlist Item List
- Card-based layout, mobile-optimized
- Drag-to-reorder (or up/down buttons for simplicity on mobile)
- Empty state with a prompt to add items

### 5.2 Add / Edit Item Form
- Fields: title (required), description, URL, price (with nudge — "Adding a price helps your Santa!"), priority
- Image upload (one or more): client requests a presigned URL from the API, uploads directly to DigitalOcean Spaces, stores the CDN URL

### 5.3 Image Upload Flow
1. Client POSTs to `/api/upload/presign` → server returns a presigned PUT URL
2. Client PUTs the file directly to Spaces using the presigned URL
3. Client POSTs the final CDN URL to save it on the `WishlistImage` record

### 5.4 Delete Item
- Confirmation prompt before deletion
- Deletes images from Spaces and removes DB records

---

## Phase 6 — Partner Wishlist View

**Route:** `/partner`

### 6.1 Partner Identity Header
- Shows the recipient's name and display name at the top of the page
- Budget banner: "Your budget is $[X]" (if set for the season)

### 6.2 Recipient's Wishlist
- Read-only card view of all the recipient's wishlist items
- Each item shows: title, description, link, price, priority, images
- Prices on recipient's items are visible to the giver

### 6.3 Giver Item Tracking
- Each item card has a "Mark as Planning to Buy" toggle (giver-only, never shown to recipient)
- Toggle cycles: unmarked → Planning → Purchased → unmarked
- Running total footer: sum of prices of marked items vs. the season budget
  - e.g. "Selected: $42 / $50 budget"
  - Unpriced items excluded from total but shown with a "-" placeholder

---

## Phase 7 — Anonymous Messaging

**Route:** `/messages`

### 7.1 Message Thread View
- Conversation-style layout (like iMessage/SMS bubbles)
- Giver's messages aligned right, receiver's messages aligned left
- Labels: "You" and "Your Secret Santa" / "Your Giftee" (never real names)
- Unread indicator on the nav

### 7.2 Compose Message
- Toggle between canned and free-text
- **Canned messages** (rendered as tappable chips):
  - "You haven't added any wishlist items yet! 🎁"
  - "Can you add more details to one of your items?"
  - "I found your gift — you're going to love it!"
  - "Just a reminder to check your wishlist!"
  - "Happy Holidays! 🎄"
- **Free-text input**: textarea with 255-char counter, send button

### 7.3 Read Receipts
- Mark messages as read when the thread is opened
- Unread count badge on nav icon

---

## Phase 8 — Web Push Notifications

### 8.1 VAPID Key Generation [YOU]

```bash
npx web-push generate-vapid-keys
```

Add the output to `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`). Also add these as GitHub Actions secrets if environment variables need to be available during build:

| Secret | Value |
|---|---|
| `NEXTAUTH_SECRET` | Your generated secret |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `DATABASE_URL` | PostgreSQL connection string |
| *(all other .env values)* | As needed |

> **Note:** On the VPS, production env vars should be set in a `.env.production.local` file in the app directory (not committed). The deploy workflow runs `npm run build` on the VPS where this file is present.

### 8.2 Push Subscription Flow (Client)
- After login, prompt user to enable notifications (browser permission dialog)
- On approval: subscribe via `PushManager.subscribe()` with the VAPID public key
- POST the subscription object to `/api/push/subscribe` → saved to `PushSubscription` table
- Graceful fallback if denied (in-app indicators still work)

### 8.3 "Add to Home Screen" Prompt
- Detect `beforeinstallprompt` event on Android Chrome
- Show a tasteful in-app banner: "Install Santa Vibes for the best experience"
- On iOS Safari, show a manual instruction overlay (iOS doesn't support the install prompt API)

### 8.4 Push Trigger Points (Server)
Two server-side functions that send a push notification:

- `notifyGiverWishlistUpdated(receiverId)` — called when a user saves a wishlist item; notifies their giver
- `notifyNewMessage(pairingId, senderRole)` — called when a message is sent; notifies the other party

Both functions look up the target user's `PushSubscription` records and call `webpush.sendNotification()`.

---

## Phase 9 — Dashboard & Navigation

**Route:** `/dashboard` (home after login)

### 9.1 Dashboard
- Welcome message with the user's display name
- Quick-action cards:
  - My Wishlist (item count, last updated)
  - My Partner (recipient name, item count)
  - Messages (unread count badge)
- Season budget reminder if set and no items yet

### 9.2 Navigation
- Bottom tab bar on mobile (Dashboard, Wishlist, Partner, Messages)
- Top nav / sidebar on desktop
- Admin link visible only to admin users

---

## Phase 10 — Polish & QA

### 10.1 Mobile UX Pass
- Verify all forms, modals, and tap targets on a real mobile device
- Test "Add to Home Screen" flow on iOS Safari and Android Chrome
- Verify push notifications end-to-end

### 10.2 Empty States
- New user with no wishlist items
- Partner hasn't added any items yet
- No messages yet
- Pairings not yet generated (show placeholder, not an error)

### 10.3 Error Handling
- Network errors on form submit
- Image upload failures
- Push subscription failures (non-blocking)
- Invalid / expired magic links

### 10.4 Accessibility & Performance
- Ensure tap targets ≥ 44px
- Alt text on all images
- Check Lighthouse PWA score
- Confirm service worker caches shell assets for offline resilience

---

## Build Order Summary

| Phase | Description | User actions required |
|---|---|---|
| 0 | External setup | DNS, GitHub repo, VPS deps, PostgreSQL, SSH key, Nginx, SSL, Spaces, Resend |
| 1 | Project scaffold, Prisma schema, CI/CD | PM2 startup (after first deploy) |
| 2 | Authentication (magic links) | — |
| 3 | Admin: user management | — |
| 4 | Admin: season, pairing algorithm, exclusions | — |
| 5 | Wishlist CRUD + image upload | — |
| 6 | Partner view + giver item tracking | — |
| 7 | Anonymous messaging | — |
| 8 | PWA + Web Push | VAPID keys to .env and GitHub secrets, VPS .env.production.local |
| 9 | Dashboard + navigation | — |
| 10 | Polish, QA, mobile testing | — |
