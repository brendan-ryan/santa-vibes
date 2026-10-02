# Phase 6 — Partner Wishlist View

The `/partner` route shows the current user's assigned recipient's wishlist and lets them track what they plan to buy.

---

## What was built

- **Partner wishlist** — read-only view of the recipient's items, ordered by their `displayOrder`
- **Gift planning** — givers can mark items as "Planning to get" or "Purchased" via `GiverSelection`
- **Optimistic selection UI** — local state updates immediately on toggle; server refresh runs in a transition so the UI never freezes
- **Planning summary** — header shows "X planning to get · Y purchased" when selections exist
- **Budget display** — season budget shown in the header if set
- **Test mode badge** — shown when viewing a test season's pairings
- **Empty states** — handled for: no season, pairings not generated, user not in pairings, partner's wishlist is empty

---

## File map

| File | Role |
|---|---|
| `src/app/partner/page.tsx` | Server component — finds active season, user's pairing as giver, recipient's items and existing selections |
| `src/app/partner/actions.ts` | Server actions: `selectItem`, `deselectItem`, `setSelectionStatus` |
| `src/app/partner/partner-wishlist.tsx` | Client component — card list with selection controls, optimistic state |

---

## Selection state machine

```
unselected  →  PLANNING  →  PURCHASED
                ↑               ↓
                └───── toggle ──┘

Any state → unselected via "Remove from plan"
```

The `GiverSelection` row is created on first select (status: `PLANNING`), updated on toggle, and deleted on "Remove from plan". The compound unique index `@@unique([pairingId, itemId])` enforces one selection per item per pairing.

---

## Key decisions

**Optimistic UI without a state management library**
Selection state is held in a `useState(initialSelectionMap)` copy of the server-fetched map. On action success, the map is updated locally before `router.refresh()` runs in `useTransition`. This gives instant feedback without a flash.

**Ownership enforced in every action**
Every server action calls `verifyPairing(pairingId, userId)` which checks `{ id: pairingId, giverId: userId }`. A user cannot select items for a pairing they're not the giver of.

**Recipient identity is visible**
The giver knows who they're giving to — that's how Secret Santa works. The recipient doesn't know who's giving to them. The partner page shows the recipient's name and wishlist openly.

**Parallel data fetching**
`wishlistItems` and `selections` are fetched with `Promise.all` — they're independent queries so there's no reason to chain them.

**No image column yet**
`WishlistItem` has a `WishlistImage` relation but image upload is deferred (requires DO_Spaces setup). The partner view renders cards without images; images will slot in once Phase 5's image upload is wired up.
