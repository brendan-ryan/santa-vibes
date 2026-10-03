# Design: Test vs Production Seasons

## Problem

The admin needs to test the full app UX with real users before rolling out to the family each year. The existing season model (`@@unique([year])`) only allows one season per year, which means:

- Testing overwrites real user data (wishlists get wiped on reset)
- There is no safe way to verify the experience mid-production-season
- Once a test season exists, the admin cannot create a production season for the same year without first manually deleting the test record

## Requirements

1. Admin can create a **test season** to run through the full UX with a small set of test accounts
2. Admin can delete the test season at any point (not just before pairings are generated)
3. Admin can test **mid-season** — i.e. while a production season is already live — without affecting real users
4. Real family members' wishlists, messages, and pairings are never touched by test activity
5. The full user-facing flow (pairings, wishlists, partner view, messages, push notifications) is testable with real accounts logging in

## Options Considered

### Option A — Sequential (delete test, then create production)
Keep `@@unique([year])`. Add a "Delete Season" button for test seasons so the create form reappears.

**Rejected** because it doesn't support mid-season testing. Once the production season is live, there is no way to spin up a test environment.

### Option B — Separate TestUser table
A parallel set of tables replicating User, Pairing, WishlistItem, Message, etc.

**Rejected** because it duplicates the entire data model and all NextAuth auth infrastructure (sessions, verification tokens, accounts).

### Option C — `isTestAccount` flag on User + concurrent seasons ✅
Add `isTestAccount: Boolean` to the User model and relax the season uniqueness constraint to `@@unique([year, isTest])`. This allows one test season and one production season to coexist for the same year, with test accounts seeing only test data and real accounts seeing only production data.

## Proposed Design

### Schema changes

```prisma
model User {
  // ...existing fields...
  isTestAccount Boolean @default(false)
}

model Season {
  // change @@unique([year]) to:
  @@unique([year, isTest])
}
```

### Season lookup

All user-facing pages currently find the season with:
```typescript
db.season.findUnique({ where: { year } })
```

This changes to match the current user's account type:
```typescript
db.season.findFirst({ where: { year, isTest: session.user.isTestAccount } })
```

Test accounts see the test season. Real accounts see the production season. Neither can see the other's data.

### Pairing generation

- Test seasons only include users where `isTestAccount = true`
- Production seasons only include users where `isTestAccount = false`

### Wipe / Delete

- **Wipe** deletes pairings, messages, selections, and wishlists — but only for `isTestAccount = true` users
- **Delete** does everything Wipe does, then removes the season record itself (so the create form reappears)
- Both actions remain gated behind `isTest = true` on the season

### Admin panel

- Two separate season panels: **Test Season** and **Production Season**
- A **Test Accounts** section (separate from the family user list) to create and manage the 2–4 fake accounts used for testing

## Open Questions

These need answers before implementation:

1. **Admin account type** — Should the admin's own account be `isTestAccount = false` (real, included in production pairings), with a separate `admin-test@...` account for testing? Or should the admin be excluded from pairings entirely?

2. **Minimum test accounts** — How many test accounts are needed? Minimum 2 to generate a pairing; more to simulate a realistic group.

3. **Test account visibility** — Should test accounts appear in the main Users list (with a badge), or in a completely separate section of the admin panel?

## Current State (pre-implementation)

- `@@unique([year])` is still in place — one season per year
- `wipeTestSeason` now deletes pairings, messages, selections, and **all** wishlist items (not scoped to test users yet)
- No `isTestAccount` field exists on User
- No Delete Season action exists yet
