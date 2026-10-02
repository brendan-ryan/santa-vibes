"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

// Returns the user's role in this pairing, or null if they're not in it
async function getPairingRole(pairingId: string, userId: string) {
  const pairing = await db.pairing.findFirst({
    where: { id: pairingId },
    select: { giverId: true, receiverId: true },
  });
  if (!pairing) return null;
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

  const role = await getPairingRole(pairingId, user.id);
  if (!role) return { error: "Pairing not found." };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Message cannot be empty." };
  if (trimmed.length > 255) return { error: "Message is too long (255 chars max)." };

  await db.message.create({
    data: { pairingId, senderRole: role, body: trimmed, isCanned },
  });

  revalidatePath("/messages");
  return { success: true };
}

export async function markMessagesRead(pairingId: string): Promise<void> {
  const user = await getAuthUser();

  const role = await getPairingRole(pairingId, user.id);
  if (!role) return;

  // Mark messages from the counterparty as read
  const otherRole = role === "GIVER" ? "RECEIVER" : "GIVER";
  await db.message.updateMany({
    where: { pairingId, senderRole: otherRole, readAt: null },
    data: { readAt: new Date() },
  });
}
