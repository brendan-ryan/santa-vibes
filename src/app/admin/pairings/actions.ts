"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generatePairings } from "@/lib/pairing-algorithm";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

const seasonSchema = z.object({
  budget: z.preprocess(
    (v) => (v === "" || v === null ? null : Number(v)),
    z.number().positive().nullable()
  ),
  isTest: z.boolean(),
});

export async function createSeason(formData: FormData) {
  await requireAdmin();

  const year = new Date().getFullYear();
  const existing = await db.season.findUnique({ where: { year } });
  if (existing) return { error: "A season for this year already exists." };

  const parsed = seasonSchema.safeParse({
    budget: formData.get("budget"),
    isTest: formData.get("isTest") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.season.create({ data: { year, ...parsed.data } });
  revalidatePath("/admin/pairings");
  return { success: true };
}

export async function runGeneratePairings(
  seasonId: string,
  respectExclusions = false
): Promise<{ error: string } | { success: true; count: number; warning?: string }> {
  await requireAdmin();

  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season) return { error: "Season not found." };

  const users = await db.user.findMany({ select: { id: true } });
  if (users.length < 2) return { error: "At least 2 users are needed." };

  const userIds = users.map((u) => u.id);

  let coupleExclusions: { userAId: string; userBId: string }[] = [];
  let historicalByYear: { year: number; pairings: { giverId: string; receiverId: string }[] }[] =
    [];

  if (!season.isTest || respectExclusions) {
    coupleExclusions = await db.ineligiblePair.findMany({
      select: { userAId: true, userBId: true },
    });
  }

  if (!season.isTest) {
    const recentSeasons = await db.season.findMany({
      where: { isTest: false, id: { not: seasonId }, generatedAt: { not: null } },
      orderBy: { year: "desc" },
      take: 3,
      include: { pairings: { select: { giverId: true, receiverId: true } } },
    });

    historicalByYear = recentSeasons.map((s) => ({
      year: s.year,
      pairings: s.pairings,
    }));
  }

  const result = generatePairings(userIds, coupleExclusions, historicalByYear);
  if (!result.success) return { error: result.error };

  await db.$transaction(async (tx) => {
    await tx.pairing.deleteMany({ where: { seasonId } });
    await tx.pairing.createMany({
      data: result.pairings.map((p) => ({ seasonId, giverId: p.giverId, receiverId: p.receiverId })),
    });
    await tx.season.update({ where: { id: seasonId }, data: { generatedAt: new Date() } });
  });

  revalidatePath("/admin/pairings");
  return { success: true, count: result.pairings.length, warning: result.warning };
}

export async function wipeTestSeason(seasonId: string) {
  await requireAdmin();

  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season?.isTest) return { error: "Only test seasons can be wiped." };

  await db.$transaction(async (tx) => {
    // Pairings → messages + giver selections cascade automatically
    await tx.pairing.deleteMany({ where: { seasonId } });
    // WishlistItems → wishlist images cascade automatically
    await tx.wishlistItem.deleteMany({});
    await tx.season.update({
      where: { id: seasonId },
      data: { generatedAt: null, resetAt: new Date() },
    });
  });

  revalidatePath("/admin/pairings");
  revalidatePath("/wishlist");
  return { success: true };
}

export async function createHistoricalSeason(
  year: number,
  pairings: { giverId: string; receiverId: string }[]
): Promise<{ error: string } | { success: true }> {
  await requireAdmin();

  if (!Number.isInteger(year) || year < 2000 || year >= new Date().getFullYear()) {
    return { error: "Year must be a past year (2000 or later)." };
  }
  if (pairings.length < 2) return { error: "Enter at least 2 pairings." };

  const givers = pairings.map((p) => p.giverId);
  const receivers = pairings.map((p) => p.receiverId);
  if (new Set(givers).size !== givers.length) return { error: "Each person can only appear once as giver." };
  if (new Set(receivers).size !== receivers.length) return { error: "Each person can only appear once as receiver." };
  if (pairings.some((p) => p.giverId === p.receiverId)) return { error: "A person cannot give to themselves." };

  const existing = await db.season.findUnique({ where: { year } });
  if (existing) return { error: `A season for ${year} already exists.` };

  await db.$transaction(async (tx) => {
    const season = await tx.season.create({
      data: { year, isTest: false, generatedAt: new Date() },
    });
    await tx.pairing.createMany({
      data: pairings.map((p) => ({ seasonId: season.id, giverId: p.giverId, receiverId: p.receiverId })),
    });
  });

  revalidatePath("/admin/pairings");
  return { success: true };
}

export async function deleteHistoricalSeason(
  seasonId: string
): Promise<{ error: string } | { success: true }> {
  await requireAdmin();

  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season) return { error: "Season not found." };
  if (season.year >= new Date().getFullYear()) return { error: "Cannot delete the current season here." };

  // Pairings cascade
  await db.season.delete({ where: { id: seasonId } });

  revalidatePath("/admin/pairings");
  return { success: true };
}
