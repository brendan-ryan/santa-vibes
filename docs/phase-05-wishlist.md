# Phase 5 — Wishlist Management

Each user can maintain a personal wishlist at `/wishlist`: add items they'd like to receive, edit them, reorder by priority, and delete them.

---

## What was built

- **Item CRUD** — add, edit, and delete wishlist items via a modal form
- **Priority system** — HIGH / NORMAL / LOW; HIGH shows a red badge, LOW shows a grey "nice to have" badge
- **Price field** — optional, with a budget nudge ("Adding a price helps your Santa stay on budget.")
- **URL field** — optional product link; rendered as a "View item →" anchor on the card
- **Reorder** — up/down arrow buttons swap adjacent items using `displayOrder`; buttons are disabled at list edges
- **Delete confirmation** — inline confirm UI replaces the action row; no separate dialog
- **Defense-in-depth auth** — added a `signIn` callback to `auth.ts` that rejects sign-ins for emails not in the DB, closing the theoretical edge case where a valid token could be used to create an unauthorized account

---

## File map

| File | Role |
|---|---|
| `src/app/wishlist/page.tsx` | Server component — fetches items for the current user, converts `Decimal` price to `number` |
| `src/app/wishlist/actions.ts` | Server actions: `createItem`, `updateItem`, `deleteItem`, `moveItem` |
| `src/app/wishlist/wishlist-view.tsx` | Client component — card list, reorder, delete confirmation, opens form modal |
| `src/app/wishlist/item-form.tsx` | Client component — modal form for add/edit, slides up from bottom on mobile |

---

## Key decisions

**Mobile-first modal**
The form modal uses `items-end` on mobile (slides up from the bottom like a native sheet) and `items-center` on `sm:` screens (centered dialog). This matches iOS/Android UX expectations without a native API.

**Decimal → number at the server boundary**
Prisma's `Decimal` type is not JSON-serializable. The server component converts `item.price` to `Number(item.price)` before passing the array to the client component. The client stores `number | null`.

**`displayOrder` swap via `$transaction`**
Reordering swaps the `displayOrder` values of two adjacent items atomically. New items are appended at `count` (current item count), so they land at the bottom. This keeps ordering stable without gaps.

**Ownership check in every mutation**
All server actions find the item by `{ id, userId: user.id }` before acting. If the item doesn't belong to the current user (or doesn't exist), the action returns `{ error: "Item not found." }` — same message for both cases to avoid leaking existence.

**No image upload in Phase 5**
DigitalOcean Spaces credentials (`DO_SPACES_KEY`, `DO_SPACES_SECRET`) are not yet configured. Image upload will be added when Spaces is set up, following the same pattern as the rest of the form.

---

## Auth security addition

The `signIn` callback in `src/lib/auth.ts` now performs a second check:

```ts
async signIn({ user }) {
  const existing = await db.user.findUnique({ where: { email: user.email! } });
  return !!existing;
},
```

Combined with the existing `sendVerificationRequest` guard (which skips unknown emails before even logging/sending a link), this means:

1. No magic link is ever issued to an unknown email (first layer)
2. Even if a valid token somehow existed, `signIn` rejects the callback (second layer)
