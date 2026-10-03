"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendPushToUser } from "@/lib/push";

async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function getPairing(pairingId: string) {
  return db.pairing.findFirst({
    where: { id: pairingId },
    select: {
      giverId: true,
      receiverId: true,
      giver: { select: { name: true, displayName: true } },
      receiver: { select: { name: true, displayName: true } },
    },
  });
}

function roleInPairing(pairing: NonNullable<Awaited<ReturnType<typeof getPairing>>>, userId: string) {
  if (pairing.giverId === userId) return "GIVER" as const;
  if (pairing.receiverId === userId) return "RECEIVER" as const;
  return null;
}

export async function sendMessage(
  pairingId: string,
  body: string,
  isCanned = false
): Promise<{ error: string } | { success: true }> {
  const user = await getAuthUser();

  const pairing = await getPairing(pairingId);
  if (!pairing) return { error: "Pairing not found." };

  const role = roleInPairing(pairing, user.id);
  if (!role) return { error: "Pairing not found." };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Message cannot be empty." };
  if (trimmed.length > 255) return { error: "Message is too long (255 chars max)." };

  await db.message.create({
    data: { pairingId, senderRole: role, body: trimmed, isCanned },
  });

  // Notify the counterparty
  const counterpartyId = role === "GIVER" ? pairing.receiverId : pairing.giverId;
  const senderName = role === "RECEIVER"
    ? (pairing.receiver.displayName ?? pairing.receiver.name)
    : null;

  sendPushToUser(counterpartyId, {
    title: "Secret Santa",
    body: role === "GIVER"
      ? "Your Secret Santa sent you a message 🎅"
      : `${senderName} sent you a message 🎁`,
    url: "/messages",
  }).catch(() => {});

  revalidatePath("/messages");
  return { success: true };
}

export async function markMessagesRead(pairingId: string): Promise<void> {
  const user = await getAuthUser();

  const pairing = await getPairing(pairingId);
  if (!pairing) return;
  const role = roleInPairing(pairing, user.id);
  if (!role) return;

  // Mark messages from the counterparty as read
  const otherRole = role === "GIVER" ? "RECEIVER" : "GIVER";
  await db.message.updateMany({
    where: { pairingId, senderRole: otherRole, readAt: null },
    data: { readAt: new Date() },
  });
}
