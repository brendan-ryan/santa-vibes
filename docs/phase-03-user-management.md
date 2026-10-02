# Phase 3 — Admin: User Management

Admin-only UI for creating, editing, and deleting user accounts at `/admin/users`.

---

## What was built

- **Admin shell layout** — persistent header with nav links to all admin sections; server-side role check
- **User list** — cards showing name, display name, email, and role badge
- **Create user** — modal form triggered by "Add user" button
- **Edit user** — same modal form pre-populated with the user's current data
- **Delete user** — confirmation prompt before deletion; self-deletion blocked

---

## File map

| File | Role |
|---|---|
| `src/app/admin/layout.tsx` | Admin section shell — header nav, server-side ADMIN role gate |
| `src/app/admin/page.tsx` | `/admin` redirect to `/admin/users` |
| `src/app/admin/users/page.tsx` | Server component — fetches users from DB and renders `UserList` |
| `src/app/admin/users/user-list.tsx` | Client component — renders user cards, manages modal open/close state |
| `src/app/admin/users/user-form.tsx` | Client component — create/edit modal form |
| `src/app/admin/users/actions.ts` | Server actions — `createUser`, `updateUser`, `deleteUser` |

---

## Data flow

```
/admin/users (server component)
  → reads session, checks ADMIN role
  → queries db.user.findMany directly (no API route)
  → passes users + currentUserId to <UserList>

UserList (client component)
  → renders user cards
  → opens <UserForm> modal on "Add user" or "Edit"
  → calls deleteUser server action on delete confirm

UserForm (client component)
  → controlled form with name / displayName / email / role fields
  → on submit: calls createUser or updateUser server action
  → on success: router.refresh() reloads server component data, closes modal

Server actions (actions.ts)
  → re-checks ADMIN role on every call (server-side guard, not just proxy)
  → validates input with Zod
  → checks for email uniqueness before create/update
  → calls revalidatePath("/admin/users") so Next.js re-fetches on next load
```

---

## Key decisions

**Server actions instead of API routes**
Mutations (create, update, delete) use Next.js server actions rather than separate `/api/` routes. Server actions execute on the server, have access to the database, and don't require a separate fetch call from the client. The client calls them like async functions. This removes a whole layer of boilerplate (route handler, request parsing, response shaping).

**Server component reads DB directly**
The page component queries Prisma directly rather than fetching from an API. Server components have full access to the Node.js environment, so there's no need for an intermediary HTTP layer for reads.

**Role guard in both proxy and layout**
The proxy middleware (`proxy.ts`) already redirects non-admins away from `/admin/*`. The layout adds a second server-side check as defense-in-depth — if someone bypasses the proxy (e.g. direct server-side navigation), they still can't see admin content. The server actions also re-check the role independently.

**Self-deletion prevention**
The delete button is hidden for the currently logged-in user in the UI, and `deleteUser` also enforces this server-side. If the admin deleted themselves they would be logged out with no way back in.

**`displayName` as null vs empty string**
The DB schema uses `null` for "no display name set." The form submits empty string when the field is blank. The server action converts empty string to `null` before writing to the database, keeping the DB semantics clean (null = not set).

**`router.refresh()` instead of redirect**
After a successful create or edit, the form calls `router.refresh()` and closes the modal. This re-runs the server component (re-fetching the updated user list) without a full page navigation, keeping the admin in place.

---

## Cascades on delete

Deleting a user triggers Prisma cascades defined in the schema:
- `WishlistItem` (and their `WishlistImage`, `GiverSelection`) — deleted
- `PushSubscription` — deleted
- `Account`, `Session` (NextAuth records) — deleted

`Pairing` records are **not** cascaded from User — they're preserved for the 3-year pairing history used by the exclusion algorithm.
