import { db } from "@/lib/db";
import SeasonPanel from "./season-panel";
import HistoricalPanel from "./historical-panel";

export default async function PairingsPage() {
  const currentYear = new Date().getFullYear();

  const [season, users, historicalSeasons] = await Promise.all([
    db.season.findUnique({
      where: { year: currentYear },
      include: { _count: { select: { pairings: true } } },
    }),
    db.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, displayName: true },
    }),
    db.season.findMany({
      where: { year: { lt: currentYear }, isTest: false },
      orderBy: { year: "desc" },
      include: { pairings: { select: { giverId: true, receiverId: true } } },
    }),
  ]);

  const seasonForClient = season
    ? {
        id: season.id,
        year: season.year,
        budget: season.budget ? Number(season.budget) : null,
        isTest: season.isTest,
        generatedAt: season.generatedAt,
        pairingCount: season._count.pairings,
      }
    : null;

  return (
    <div className="space-y-6">
      <SeasonPanel season={seasonForClient} currentYear={currentYear} />
      <HistoricalPanel
        users={users}
        historicalSeasons={historicalSeasons.map((s) => ({
          id: s.id,
          year: s.year,
          pairings: s.pairings,
        }))}
        currentYear={currentYear}
      />
    </div>
  );
}
