import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import WishlistView from "./wishlist-view";

export const metadata = { title: "My Wishlist — Santa Vibes" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const items = await db.wishlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      price: true,
      priority: true,
      displayOrder: true,
      images: { select: { storageUrl: true }, orderBy: { displayOrder: "asc" }, take: 1 },
    },
  });

  const itemsForClient = items.map(({ images, price, ...rest }) => ({
    ...rest,
    price: price ? Number(price) : null,
    imageUrl: images[0]?.storageUrl ?? null,
  }));

  return <WishlistView items={itemsForClient} />;
}
