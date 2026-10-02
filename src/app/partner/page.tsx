import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import PartnerWishlist from "./partner-wishlist";

export const metadata = { title: "Your Partner — Santa Vibes" };

export default async function PartnerPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const year = new Date().getFullYear();

  const season = await db.season.findUnique({
    where: { year },
    select: { id: true, generatedAt: true, budget: true, isTest: true },
  });

  if (!season?.generatedAt) {
    return <EmptyState message="Pairings haven't been generated yet — check back soon!" />;
  }

  const pairing = await db.pairing.findUnique({
    where: {
      seasonId_giverId: { seasonId: season.id, giverId: session.user.id },
    },
    select: {
      id: true,
      receiver: {
        select: { id: true, name: true, displayName: true },
      },
    },
  });

  if (!pairing) {
    return <EmptyState message="You're not included in this year's pairings." />;
  }

  const [wishlistItems, selections] = await Promise.all([
    db.wishlistItem.findMany({
      where: { userId: pairing.receiver.id },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        price: true,
        priority: true,
      },
    }),
    db.giverSelection.findMany({
      where: { pairingId: pairing.id },
      select: { id: true, itemId: true, status: true },
    }),
  ]);

  const items = wishlistItems.map((item) => ({
    ...item,
    price: item.price ? Number(item.price) : null,
  }));

  const selectionMap = Object.fromEntries(selections.map((s) => [s.itemId, s]));

  return (
    <PartnerWishlist
      pairingId={pairing.id}
      partner={pairing.receiver}
      items={items}
      selectionMap={selectionMap}
      budget={season.budget ? Number(season.budget) : null}
      isTest={season.isTest}
    />
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🎅</div>
        <p className="font-medium text-zinc-700">{message}</p>
      </div>
    </div>
  );
}
