"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSeason, runGeneratePairings, wipeTestSeason } from "./actions";

type Season = {
  id: string;
  year: number;
  budget: number | null;
  isTest: boolean;
  generatedAt: Date | null;
  pairingCount: number;
} | null;

type GenerateResult =
  | { type: "success"; count: number; warning?: string }
  | { type: "error"; message: string };

export default function SeasonPanel({
  season,
  currentYear,
}: {
  season: Season;
  currentYear: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const r = await createSeason(new FormData(e.currentTarget));
    if ("error" in r && r.error) {
      setResult({ type: "error", message: r.error });
    }
    setLoading(false);
    router.refresh();
  }

  async function handleGenerate() {
    if (!season) return;
    setLoading(true);
    setResult(null);
    const r = await runGeneratePairings(season.id);
    if ("error" in r) {
      setResult({ type: "error", message: r.error });
    } else {
      setResult({ type: "success", count: r.count, warning: r.warning });
    }
    setLoading(false);
    setConfirmRegenerate(false);
    router.refresh();
  }

  async function handleWipe() {
    if (!season) return;
    setLoading(true);
    setResult(null);
    await wipeTestSeason(season.id);
    setLoading(false);
    setConfirmWipe(false);
    router.refresh();
  }

  // No season yet — show create form
  if (!season) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">
          {currentYear} Season
        </h2>
        <p className="text-sm text-zinc-500 mb-6">No season created yet for {currentYear}.</p>
        <form onSubmit={handleCreate} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Budget{" "}
              <span className="text-zinc-400 font-normal">(optional, e.g. 50)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
              <input
                type="number"
                name="budget"
                min="0"
                step="0.01"
                placeholder="50.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent"
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="isTest" className="w-4 h-4 accent-red-700" />
            <div>
              <span className="text-sm font-medium text-zinc-700">Test mode</span>
              <p className="text-xs text-zinc-500">Skips all exclusion rules. Safe to wipe after testing.</p>
            </div>
          </label>
          {result?.type === "error" && (
            <p className="text-sm text-red-600">{result.message}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : `Create ${currentYear} Season`}
          </button>
        </form>
      </div>
    );
  }

  const isGenerated = !!season.generatedAt;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
      {/* Season header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">{season.year} Season</h2>
            {season.isTest && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                Test
              </span>
            )}
          </div>
          {season.budget != null && (
            <p className="text-sm text-zinc-500 mt-0.5">
              Budget: ${season.budget.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Result banner */}
      {result?.type === "success" && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm">
          <p className="font-medium text-green-800">
            {result.count} participants matched for {season.year}.
          </p>
          {result.warning && (
            <p className="mt-1 text-amber-700">⚠ {result.warning}</p>
          )}
        </div>
      )}
      {result?.type === "error" && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {result.message}
        </div>
      )}

      {/* Status */}
      {isGenerated && !result && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm">
          <p className="font-medium text-green-800">
            {season.pairingCount} participants matched.
          </p>
          <p className="text-green-700 mt-0.5 text-xs">
            Individual assignments are hidden to preserve your surprise.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!isGenerated && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-5 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Generating…" : "Generate Pairings"}
          </button>
        )}

        {isGenerated && !confirmRegenerate && (
          <button
            onClick={() => setConfirmRegenerate(true)}
            className="px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Regenerate
          </button>
        )}

        {isGenerated && confirmRegenerate && (
          <div className="w-full rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-3">
            <p className="text-sm text-amber-800">
              This will replace all existing assignments for {season.year}. Wishlist selections and
              messages will be lost. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRegenerate(false)}
                className="px-4 py-1.5 border border-zinc-300 text-zinc-700 text-sm rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-1.5 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Regenerating…" : "Yes, regenerate"}
              </button>
            </div>
          </div>
        )}

        {season.isTest && !confirmWipe && (
          <button
            onClick={() => setConfirmWipe(true)}
            disabled={loading}
            className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Wipe All Test Data
          </button>
        )}

        {season.isTest && confirmWipe && (
          <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-3">
            <p className="text-sm font-medium text-red-800">This will permanently delete:</p>
            <ul className="text-sm text-red-700 space-y-0.5 list-disc list-inside">
              <li>All pairings for this season</li>
              <li>All messages between participants</li>
              <li>All giver selections</li>
              <li>All wishlist items and photos for every user</li>
            </ul>
            <p className="text-xs text-red-600">Only available because this is a test season. Cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmWipe(false)}
                className="px-4 py-1.5 border border-zinc-300 text-zinc-700 text-sm rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWipe}
                disabled={loading}
                className="px-4 py-1.5 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Wiping…" : "Yes, wipe everything"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
