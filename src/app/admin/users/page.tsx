import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import UserList from "./user-list";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      role: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return <UserList users={users} currentUserId={session.user.id} />;
}
