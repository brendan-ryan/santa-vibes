"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function verifyPairing(pairingId: string, userId: string) {
  const pairing = await db.pairing.findFirst({
    where: { id: pairingId, giverId: userId },
  });
  if (!pairing) throw new Error("Pairing not found.");
  return pairing;
}

export async function selectItem(
  pairingId: string,
  itemId: string
): Promise<{ error: string } | { success: true }> {
  const user = await getAuthUser();
  await verifyPairing(pairingId, user.id);

  await db.giverSelection.upsert({
    where: { pairingId_itemId: { pairingId, itemId } },
    create: { pairingId, itemId, status: "PLANNING" },
    update: {},
  });

  revalidatePath("/partner");
  return { success: true };
}

export async function deselectItem(
  pairingId: string,
  itemId: string
): Promise<{ error: string } | { success: true }> {
  const user = await getAuthUser();
  await verifyPairing(pairingId, user.id);

  await db.giverSelection.deleteMany({ where: { pairingId, itemId } });
  revalidatePath("/partner");
  return { success: true };
}

export async function setSelectionStatus(
  pairingId: string,
  itemId: string,
  status: "PLANNING" | "PURCHASED"
): Promise<{ error: string } | { success: true }> {
  const user = await getAuthUser();
  await verifyPairing(pairingId, user.id);

  await db.giverSelection.update({
    where: { pairingId_itemId: { pairingId, itemId } },
    data: { status },
  });

  revalidatePath("/partner");
  return { success: true };
}
