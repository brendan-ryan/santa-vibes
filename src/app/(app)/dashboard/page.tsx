import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import NotificationBanner from "@/components/notification-banner";
import SignOutButton from "@/components/sign-out-button";

export const metadata = { title: "Home — Santa Vibes" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const year = new Date().getFullYear();
  const userId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  const [season, wishlistCount, currentUser] = await Promise.all([
    db.season.findUnique({
      where: { year },
      select: { id: true, budget: true, isTest: true, generatedAt: true },
    }),
    db.wishlistItem.count({ where: { userId } }),
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, displayName: true, email: true },
    }),
  ]);

  let partnerName: string | null = null;
  let unreadCount = 0;

  if (season?.generatedAt) {
    const [pairing, unread] = await Promise.all([
      db.pairing.findUnique({
        where: { seasonId_giverId: { seasonId: season.id, giverId: userId } },
        select: { receiver: { select: { name: true, displayName: true } } },
      }),
      db.message.count({
        where: {
          readAt: null,
          OR: [
            { senderRole: "RECEIVER", pairing: { seasonId: season.id, giverId: userId } },
            { senderRole: "GIVER", pairing: { seasonId: season.id, receiverId: userId } },
          ],
        },
      }),
    ]);

    if (pairing) {
      partnerName = pairing.receiver.displayName ?? pairing.receiver.name;
    }
    unreadCount = unread;
  }

  const displayName =
    currentUser?.displayName ??
    currentUser?.name?.split(" ")[0] ??
    currentUser?.email ??
    "there";

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <NotificationBanner />

        {/* Greeting */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-zinc-900">
            Hi, {displayName}! 🎄
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{year} Secret Santa</p>
        </div>

        {/* Season status */}
        <SectionCard
          href={isAdmin ? "/admin/pairings" : undefined}
          icon="🎅"
          title={`${year} Season`}
          subtitle={
            !season
              ? "No season created yet"
              : !season.generatedAt
              ? "Pairings not generated yet"
              : `Pairings ready${season.budget ? ` · Budget: $${Number(season.budget).toFixed(0)}` : ""}`
          }
          badge={season?.isTest ? "Test" : undefined}
          badgeColor="amber"
          statusDot={season?.generatedAt ? "green" : "zinc"}
          showArrow={isAdmin}
        />

        {/* Partner */}
        {season?.generatedAt && partnerName && (
          <SectionCard
            href="/partner"
            icon="🎁"
            title="Your Person"
            subtitle={`${partnerName} — view their wishlist`}
            showArrow
          />
        )}

        {!season?.generatedAt && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3 text-zinc-400">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-sm font-medium text-zinc-500">Partner wishlist</p>
              <p className="text-xs">Available once pairings are generated</p>
            </div>
          </div>
        )}

        {/* Wishlist */}
        <SectionCard
          href="/wishlist"
          icon="📋"
          title="My Wishlist"
          subtitle={
            wishlistCount === 0
              ? "Add items to help your Santa"
              : `${wishlistCount} item${wishlistCount === 1 ? "" : "s"}`
          }
          statusDot={wishlistCount > 0 ? "green" : "zinc"}
          showArrow
        />

        {/* Messages */}
        <SectionCard
          href="/messages"
          icon="💬"
          title="Messages"
          subtitle={
            !season?.generatedAt
              ? "Available once pairings are generated"
              : unreadCount > 0
              ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
              : "No new messages"
          }
          badge={unreadCount > 0 ? String(unreadCount) : undefined}
          badgeColor="red"
          showArrow={!!season?.generatedAt}
        />

        {/* Admin panel */}
        {isAdmin && (
          <SectionCard
            href="/admin"
            icon="⚙️"
            title="Admin Panel"
            subtitle="Users, pairings, exclusions"
            showArrow
          />
        )}

        {/* Account footer */}
        <div className="flex items-center justify-between pt-2 pb-2">
          <p className="text-xs text-zinc-400 truncate">{currentUser?.email}</p>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  href,
  icon,
  title,
  subtitle,
  badge,
  badgeColor = "zinc",
  statusDot,
  showArrow = false,
}: {
  href?: string;
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: "red" | "amber" | "zinc";
  statusDot?: "green" | "zinc";
  showArrow?: boolean;
}) {
  const badgeClasses = {
    red: "bg-red-700 text-white",
    amber: "bg-amber-100 text-amber-700",
    zinc: "bg-zinc-100 text-zinc-500",
  };

  const content = (
    <div className="flex items-center gap-3 p-4">
      <span className="text-2xl w-8 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">{title}</span>
          {badge && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeClasses[badgeColor]}`}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {statusDot && (
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                statusDot === "green" ? "bg-emerald-500" : "bg-zinc-300"
              }`}
            />
          )}
          <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
        </div>
      </div>
      {showArrow && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="flex-shrink-0 text-zinc-300"
          aria-hidden
        >
          <path
            d="M6 3l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );

  const cardClass = "bg-white rounded-xl border border-zinc-200 overflow-hidden";

  if (href) {
    return (
      <Link href={href} className={`${cardClass} block hover:border-zinc-300 transition-colors active:bg-zinc-50`}>
        {content}
      </Link>
    );
  }

  return <div className={cardClass}>{content}</div>;
}
