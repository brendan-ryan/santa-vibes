import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import MessagesView from "./messages-view";

export const metadata = { title: "Messages — Secret Santa" };

export default async function MessagesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const year = new Date().getFullYear();

  const season = await db.season.findUnique({
    where: { year },
    select: { id: true, generatedAt: true },
  });

  if (!season?.generatedAt) {
    return (
      <EmptyState message="Pairings haven't been generated yet — check back soon!" />
    );
  }

  const [giverPairing, receiverPairing] = await Promise.all([
    db.pairing.findUnique({
      where: {
        seasonId_giverId: { seasonId: season.id, giverId: session.user.id },
      },
      select: {
        id: true,
        receiver: { select: { name: true, displayName: true } },
        messages: { orderBy: { sentAt: "asc" } },
      },
    }),
    db.pairing.findUnique({
      where: {
        seasonId_receiverId: { seasonId: season.id, receiverId: session.user.id },
      },
      select: {
        id: true,
        messages: { orderBy: { sentAt: "asc" } },
      },
    }),
  ]);

  if (!giverPairing && !receiverPairing) {
    return <EmptyState message="You're not in this year's pairings." />;
  }

  type Thread = {
    pairingId: string;
    role: "GIVER" | "RECEIVER";
    partnerName: string;
    unreadCount: number;
    messages: {
      id: string;
      senderRole: "GIVER" | "RECEIVER";
      body: string;
      isCanned: boolean;
      sentAt: string;
      readAt: string | null;
    }[];
  };

  const threads: Thread[] = [];

  if (giverPairing) {
    const partnerName =
      giverPairing.receiver.displayName ?? giverPairing.receiver.name;
    const unreadCount = giverPairing.messages.filter(
      (m) => m.senderRole === "RECEIVER" && !m.readAt
    ).length;
    threads.push({
      pairingId: giverPairing.id,
      role: "GIVER",
      partnerName,
      unreadCount,
      messages: giverPairing.messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        body: m.body,
        isCanned: m.isCanned,
        sentAt: m.sentAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
      })),
    });
  }

  if (receiverPairing) {
    const unreadCount = receiverPairing.messages.filter(
      (m) => m.senderRole === "GIVER" && !m.readAt
    ).length;
    threads.push({
      pairingId: receiverPairing.id,
      role: "RECEIVER",
      partnerName: "Your Secret Santa",
      unreadCount,
      messages: receiverPairing.messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        body: m.body,
        isCanned: m.isCanned,
        sentAt: m.sentAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
      })),
    });
  }

  return <MessagesView threads={threads} />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-5xl mb-4">💬</div>
        <p className="font-medium text-zinc-700">{message}</p>
      </div>
    </div>
  );
}
