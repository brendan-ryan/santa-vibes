import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import BottomNav from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const year = new Date().getFullYear();
  let unreadCount = 0;

  const season = await db.season.findUnique({
    where: { year },
    select: { id: true, generatedAt: true },
  });

  if (season?.generatedAt) {
    unreadCount = await db.message.count({
      where: {
        readAt: null,
        OR: [
          {
            senderRole: "RECEIVER",
            pairing: { seasonId: season.id, giverId: session.user.id },
          },
          {
            senderRole: "GIVER",
            pairing: { seasonId: season.id, receiverId: session.user.id },
          },
        ],
      },
    });
  }

  return (
    <div className="pb-16">
      {children}
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}
