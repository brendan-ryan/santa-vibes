# Phase 4 — Admin: Season & Pairing

Season management, pairing generation algorithm, and exclusion management for `/admin/pairings` and `/admin/exclusions`.

---

## What was built

- **Season creation** — form to create the current year's season with optional budget and test mode flag
- **Pairing generation** — algorithm that assigns every participant exactly one recipient, respecting exclusion rules
- **Pairing UI** — confirm/generate flow with success/warning/error feedback; regenerate with two-step confirmation; wipe for test seasons
- **Couple exclusions** — add/remove bidirectional permanent exclusions between two users
- **Historical pairing view** — admin-visible table of who gave to whom in all prior real seasons

---

## File map

| File | Role |
|---|---|
| `src/lib/pairing-algorithm.ts` | Pure algorithm function — no DB access, fully testable in isolation |
| `src/app/admin/pairings/page.tsx` | Server component — fetches current season, converts Decimal to number |
| `src/app/admin/pairings/actions.ts` | Server actions: `createSeason`, `runGeneratePairings`, `wipeTestSeason` |
| `src/app/admin/pairings/season-panel.tsx` | Client component — all interactive states (create / generate / regenerate / wipe) |
| `src/app/admin/exclusions/page.tsx` | Server component — fetches exclusions, users, and historical seasons in parallel |
| `src/app/admin/exclusions/actions.ts` | Server actions: `addExclusion`, `removeExclusion` |
| `src/app/admin/exclusions/exclusion-manager.tsx` | Client component — couple exclusion list and add form |

---

## Pairing algorithm

**Location:** `src/lib/pairing-algorithm.ts`

The algorithm is a randomized constraint-satisfying derangement finder:

```
Input:
  userIds[]            — all participants
  coupleExclusions[]   — bidirectional permanent pairs (A↔B)
  historicalByYear[]   — directed pairings from up to 3 prior seasons

Steps:
1. Build a combined exclusion set as string keys "giverId:receiverId"
   - Couples add both A→B and B→A
   - Historical adds only the actual directed pairing (A gave to B)
2. Shuffle userIds as receivers
3. Check every (giver=userIds[i], receiver=shuffled[i]) pair against the exclusion set
4. If all valid → success
5. Repeat up to 2000 times
6. If no valid assignment found:
   - Relax the oldest year's historical exclusions and retry
   - Relax the next oldest year and retry
   - If still no assignment → return error
```

**Relaxation logic:** constraints are progressively removed oldest-first. A `warning` string is returned alongside the pairings if any relaxation was needed, so the UI can surface it to the admin.

**Why randomized?** For groups of 10–30 people, 2000 shuffle-and-check iterations is more than sufficient. A deterministic backtracking algorithm would also work but adds complexity for no practical benefit at this scale.

---

## Key decisions

**Test mode**
Set at season creation time, not generation time. When `isTest = true`, the algorithm receives empty exclusion sets (couples and history are skipped). Test seasons can be wiped (pairings deleted, `generatedAt` reset to null) so the admin can re-test. Real seasons cannot be wiped — only regenerated (which replaces pairings but keeps the season).

**Admin cannot see current season's individual assignments**
The pairings page shows only the count ("X participants matched"), not who is giving to whom. This preserves the admin's own surprise. Historical seasons are fully visible on the exclusions page, which is intentional for auditing the 3-year lookback.

**`Decimal` serialization**
Prisma's `Decimal` type (used for `Season.budget`) is not JSON-serializable. The server component converts it to `number | null` before passing to the client component.

**Couple exclusions are normalized**
When storing an `IneligiblePair`, both user IDs are sorted lexicographically before writing. This prevents duplicates regardless of which order the admin selects the users in the form.

**`$transaction` for atomic pairing writes**
Pairing generation uses `db.$transaction` to atomically delete old pairings and create new ones. If the creation fails partway through, no partial state is committed.

**Wipe keeps the season record**
`wipeTestSeason` deletes all pairings and resets `generatedAt` to null, but keeps the `Season` row. This lets the admin regenerate without going through the "create season" flow again. The cascade from `Pairing` handles `GiverSelection` and `Message` cleanup automatically.

---

## Exclusion precedence

```
Couple exclusions  →  permanent, bidirectional, never relaxed
Historical year N  →  relaxed first (oldest year relaxed first if algorithm fails)
Historical year N-1
Historical year N-2
```

The algorithm always attempts with all constraints before relaxing. If it succeeds with full constraints, no warning is shown.
