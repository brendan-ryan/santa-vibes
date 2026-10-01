# Santa Vibes — Dependency Reference

All packages used in the project, grouped by purpose.

---

## Core Framework

| Package | Why |
|---|---|
| `next` | The React framework — handles routing, server-side rendering, API routes, and the build pipeline |
| `react` + `react-dom` | React itself; required by Next.js |
| `typescript` | Type safety across the entire codebase |
| `tailwindcss` | Utility-first CSS framework; powers the mobile-first UI |
| `@tailwindcss/postcss` | PostCSS plugin that integrates Tailwind into the Next.js build |

---

## Database

| Package | Why |
|---|---|
| `prisma` | CLI tool and migration runner — defines the schema, generates migrations, and introspects the database |
| `@prisma/client` | Auto-generated, type-safe database client used in application code to query PostgreSQL |

---

## Authentication

| Package | Why |
|---|---|
| `next-auth@beta` | Authentication library for Next.js — manages sessions, magic link flow, and route protection. Beta version required for App Router compatibility |
| `@auth/prisma-adapter` | Connects NextAuth to the Prisma/PostgreSQL database so sessions and verification tokens are persisted |

---

## Email (Magic Links)

| Package | Why |
|---|---|
| `resend` | Transactional email service SDK — used exclusively to send magic link login emails; not used for notifications |

---

## Image Storage

| Package | Why |
|---|---|
| `@aws-sdk/client-s3` | AWS S3-compatible client used to interact with DigitalOcean Spaces (which speaks the S3 API) |
| `@aws-sdk/s3-request-presigner` | Generates presigned URLs so the browser can upload images directly to Spaces without routing the file through the Next.js server |

---

## Web Push Notifications

| Package | Why |
|---|---|
| `web-push` | Server-side library that sends Web Push notifications to browsers using the VAPID protocol |
| `@types/web-push` | TypeScript type definitions for `web-push` |

---

## Forms & Validation

| Package | Why |
|---|---|
| `zod` | Schema validation library — validates API request bodies and form inputs at runtime |
| `react-hook-form` | Performant form state management for React — handles field registration, validation, and submission |
| `@hookform/resolvers` | Bridges `react-hook-form` with `zod` so form validation uses the same schemas as API validation |

---

## Dev Dependencies

| Package | Why |
|---|---|
| `@types/node` | TypeScript types for Node.js APIs (used in API routes and server-side code) |
| `@types/react` + `@types/react-dom` | TypeScript types for React |
| `eslint` + `eslint-config-next` | Linting — enforces code quality and catches common Next.js mistakes |

---

## Runtime Environment

These are not npm packages but are required on the server:

| Tool | Why |
|---|---|
| **Node.js 20 LTS** | JavaScript runtime that executes the Next.js server |
| **PM2** | Process manager — keeps the Next.js app running in production, restarts it after crashes or deploys |
| **PostgreSQL 16** | The relational database that stores all app data |
| **Nginx** | Reverse proxy — terminates HTTPS, forwards requests to Next.js on port 3000 |
