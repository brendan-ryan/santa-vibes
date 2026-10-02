import { db } from "@/lib/db";
import ExclusionManager from "./exclusion-manager";

export default async function ExclusionsPage() {
  const currentYear = new Date().getFullYear();

  const [exclusions, users, historicalSeasons] = await Promise.all([
    db.ineligiblePair.findMany({
      include: {
        userA: { select: { id: true, name: true, displayName: true } },
        userB: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.user.findMany({
      select: { id: true, name: true, displayName: true },
      orderBy: { name: "asc" },
    }),
    db.season.findMany({
      where: { isTest: false, year: { lt: currentYear }, generatedAt: { not: null } },
      orderBy: { year: "desc" },
      include: {
        pairings: {
          include: {
            giver: { select: { name: true, displayName: true } },
            receiver: { select: { name: true, displayName: true } },
          },
          orderBy: { giver: { name: "asc" } },
        },
      },
    }),
  ]);

  function label(u: { name: string; displayName: string | null }) {
    return u.displayName ?? u.name;
  }

  return (
    <div className="space-y-8">
      {/* Couple exclusions */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Couple Exclusions</h2>
        <p className="text-sm text-zinc-500 mb-4">
          These pairs can never give to each other, in either direction.
        </p>
        <ExclusionManager exclusions={exclusions} users={users} />
      </section>

      {/* Historical pairings */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Pairing History</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Prior seasons — used to compute the 3-year exclusion lookback.
        </p>

        {historicalSeasons.length === 0 ? (
          <p className="text-sm text-zinc-500">No prior seasons on record.</p>
        ) : (
          <div className="space-y-6">
            {historicalSeasons.map((season) => (
              <div key={season.id}>
                <h3 className="text-sm font-semibold text-zinc-700 mb-2">{season.year}</h3>
                <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
                  {season.pairings.map((p) => (
                    <div key={p.id} className="px-4 py-2.5 flex justify-between text-sm">
                      <span className="text-zinc-900">{label(p.giver)}</span>
                      <span className="text-zinc-400">→</span>
                      <span className="text-zinc-900">{label(p.receiver)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
