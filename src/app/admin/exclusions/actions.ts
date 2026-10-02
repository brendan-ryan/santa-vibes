"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") throw new Error("Unauthorized");
}

export async function addExclusion(userAId: string, userBId: string) {
  await requireAdmin();

  if (userAId === userBId) return { error: "A user cannot be excluded from themselves." };

  // Normalize order to avoid duplicates (store lower id first)
  const [a, b] = [userAId, userBId].sort();

  const existing = await db.ineligiblePair.findFirst({
    where: {
      OR: [
        { userAId: a, userBId: b },
        { userAId: b, userBId: a },
      ],
    },
  });
  if (existing) return { error: "This exclusion already exists." };

  await db.ineligiblePair.create({ data: { userAId: a, userBId: b } });
  revalidatePath("/admin/exclusions");
  return { success: true };
}

export async function removeExclusion(id: string) {
  await requireAdmin();
  await db.ineligiblePair.delete({ where: { id } });
  revalidatePath("/admin/exclusions");
  return { success: true };
}
