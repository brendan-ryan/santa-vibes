import webpush from "web-push";
import { db } from "@/lib/db";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!pub || !priv) return;
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url: string }
) {
  ensureVapid();
  if (!vapidConfigured) return;

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });
  if (subscriptions.length === 0) return;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        // 410 = subscription expired or revoked — clean it up
        if ((err as { statusCode?: number }).statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
