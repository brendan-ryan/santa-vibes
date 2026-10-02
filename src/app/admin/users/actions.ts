"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  displayName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

async function requireAdmin(): Promise<Session> {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

function parseForm(formData: FormData) {
  return userSchema.safeParse({
    name: formData.get("name"),
    displayName: formData.get("displayName") || undefined,
    email: formData.get("email"),
    role: formData.get("role"),
  });
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "A user with that email already exists." };

  await db.user.create({
    data: {
      ...parsed.data,
      displayName: parsed.data.displayName || null,
    },
  });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const conflict = await db.user.findFirst({ where: { email: parsed.data.email, NOT: { id } } });
  if (conflict) return { error: "That email is already used by another user." };

  await db.user.update({
    where: { id },
    data: {
      ...parsed.data,
      displayName: parsed.data.displayName || null,
    },
  });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();
  if (id === session.user?.id) return { error: "You cannot delete your own account." };

  await db.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  return { success: true };
}
