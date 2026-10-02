# Phase 7 — Anonymous Messaging

Anonymous two-way chat between Secret Santa givers and their recipients at `/messages`.

---

## What was built

- **Two-thread messaging** — each user sees up to two tabs: "To [name]" (as giver) and "From Your Secret Santa" (as receiver)
- **Anonymity preserved** — the giver sees their recipient's name; the receiver sees only "Your Secret Santa" — identity never revealed to receiver
- **Canned messages** — quick-reply chips above the input, tailored by role (e.g., "Any hints? 🤔" for givers, "I just updated my wishlist!" for receivers)
- **Read receipts** — "Read" shown under sent messages once the counterparty opens the thread; `markMessagesRead` fires on thread mount
- **Unread badge** — red dot with count on the tab button for unread messages from the other party
- **Timestamp formatting** — "3:45 PM" today, "Yesterday 3:45 PM", or "Dec 25 3:45 PM" for older
- **255-char limit** — enforced in the DB schema (`@db.VarChar(255)`), in the server action (validation), and in the client (char counter appears at 200+)
- **Enter-to-send** — Shift+Enter for newlines, Enter to send
- **Full-height layout** — uses `h-[100dvh]` with flex to fill the viewport; message list scrolls independently

---

## File map

| File | Role |
|---|---|
| `src/app/messages/page.tsx` | Server component — fetches both pairings, serializes dates to ISO strings, counts unread |
| `src/app/messages/actions.ts` | Server actions: `sendMessage`, `markMessagesRead` |
| `src/app/messages/messages-view.tsx` | Client component — tab switcher, renders active `MessageThread` |
| `src/app/messages/message-thread.tsx` | Client component — chat bubbles, canned chips, input form, scroll-to-bottom |

---

## Anonymity model

```
GIVER can see:   recipient's real name, their messages
GIVER appears as: anonymous to receiver ("Your Secret Santa")

RECEIVER can see:   giver's messages (not giver's name)
RECEIVER appears as: their own name to the giver
```

The `senderRole` field on `Message` is `GIVER` or `RECEIVER` — no user ID is stored on the message itself. The receiver's client renders giver messages with the label "Your Secret Santa"; the giver's client renders receiver messages with the recipient's actual name.

---

## Key decisions

**`markMessagesRead` fires on thread mount**
Called from `useEffect` with `pairingId` as the only dep — runs once when the thread component mounts (and again if the user switches tabs). This marks incoming messages as read without requiring any user action. The "Read" receipt appears on the sender's next page refresh.

**Date serialization at the server boundary**
Prisma's `Date` objects are explicitly converted to ISO strings (`.toISOString()`) in the server component before passing to the client. The client types all use `string` for dates, avoiding any serialization ambiguity at the RSC boundary.

**Role determines bubble alignment and color**
`isMine = msg.senderRole === role` — the thread knows whether the current user is GIVER or RECEIVER and uses that to determine which side of the chat each bubble appears on. The same component handles both perspectives.

**No polling in Phase 7**
Messages update on navigation/refresh. Web Push notifications (Phase 8) will prompt users to come back to check new messages. Adding polling would work but adds unnecessary load; the push notification path is cleaner.

**`key={thread.pairingId}` on MessageThread**
When the user switches tabs, the `key` change forces MessageThread to unmount and remount. This re-fires the `markMessagesRead` effect for the newly active thread and re-triggers the scroll-to-bottom effect with the correct messages.
