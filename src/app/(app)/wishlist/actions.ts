"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

const itemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  url: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().url("Enter a valid URL including https://").nullable()
  ),
  price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().positive("Price must be a positive number").nullable()
  ),
  priority: z.enum(["HIGH", "NORMAL", "LOW"]),
});

export async function createItem(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const user = await getAuthUser();

  const parsed = itemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    url: formData.get("url"),
    price: formData.get("price"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const count = await db.wishlistItem.count({ where: { userId: user.id } });
  const imageUrl = (formData.get("imageUrl") as string) || null;

  const item = await db.wishlistItem.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      url: parsed.data.url,
      price: parsed.data.price,
      priority: parsed.data.priority,
      displayOrder: count,
    },
  });

  if (imageUrl) {
    await db.wishlistImage.create({ data: { itemId: item.id, storageUrl: imageUrl } });
  }

  revalidatePath("/wishlist");
  return { success: true };
}

export async function updateItem(
  id: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const user = await getAuthUser();

  const item = await db.wishlistItem.findFirst({ where: { id, userId: user.id } });
  if (!item) return { error: "Item not found." };

  const parsed = itemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    url: formData.get("url"),
    price: formData.get("price"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const imageUrl = formData.get("imageUrl") as string;

  await db.wishlistItem.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      url: parsed.data.url,
      price: parsed.data.price,
      priority: parsed.data.priority,
    },
  });

  // Replace image: any value replaces existing, empty string removes
  await db.wishlistImage.deleteMany({ where: { itemId: id } });
  if (imageUrl) {
    await db.wishlistImage.create({ data: { itemId: id, storageUrl: imageUrl } });
  }

  revalidatePath("/wishlist");
  return { success: true };
}

export async function deleteItem(
  id: string
): Promise<{ error: string } | { success: true }> {
  const user = await getAuthUser();

  const item = await db.wishlistItem.findFirst({ where: { id, userId: user.id } });
  if (!item) return { error: "Item not found." };

  await db.wishlistItem.delete({ where: { id } });
  revalidatePath("/wishlist");
  return { success: true };
}

export async function moveItem(
  id: string,
  direction: "up" | "down"
): Promise<{ error: string } | { success: true }> {
  const user = await getAuthUser();

  const items = await db.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { displayOrder: "asc" },
    select: { id: true, displayOrder: true },
  });

  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return { error: "Item not found." };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return { success: true };

  const a = items[idx];
  const b = items[swapIdx];

  await db.$transaction([
    db.wishlistItem.update({ where: { id: a.id }, data: { displayOrder: b.displayOrder } }),
    db.wishlistItem.update({ where: { id: b.id }, data: { displayOrder: a.displayOrder } }),
  ]);

  revalidatePath("/wishlist");
  return { success: true };
}
