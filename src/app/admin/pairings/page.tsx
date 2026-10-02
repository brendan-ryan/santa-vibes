import { db } from "@/lib/db";
import SeasonPanel from "./season-panel";

export default async function PairingsPage() {
  const currentYear = new Date().getFullYear();

  const season = await db.season.findUnique({
    where: { year: currentYear },
    include: { _count: { select: { pairings: true } } },
  });

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
    </div>
  );
}
