"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHistoricalSeason, deleteHistoricalSeason } from "./actions";

type User = { id: string; name: string; displayName: string | null };
type HistoricalSeason = {
  id: string;
  year: number;
  pairings: { giverId: string; receiverId: string }[];
};

type Props = {
  users: User[];
  historicalSeasons: HistoricalSeason[];
  currentYear: number;
};

type PairRow = { id: number; giverId: string; receiverId: string };

function userName(users: User[], id: string) {
  const u = users.find((u) => u.id === id);
  return u ? (u.displayName ?? u.name) : id;
}

export default function HistoricalPanel({ users, historicalSeasons, currentYear }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState(String(currentYear - 1));
  const [rows, setRows] = useState<PairRow[]>([{ id: 1, giverId: "", receiverId: "" }]);
  const [nextId, setNextId] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function addRow() {
    setRows((r) => [...r, { id: nextId, giverId: "", receiverId: "" }]);
    setNextId((n) => n + 1);
  }

  function removeRow(id: number) {
    setRows((r) => r.filter((row) => row.id !== id));
  }

  function updateRow(id: number, field: "giverId" | "receiverId", value: string) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const incomplete = rows.some((r) => !r.giverId || !r.receiverId);
    if (incomplete) { setError("Fill in all giver and receiver fields."); return; }
    setLoading(true);
    const result = await createHistoricalSeason(
      Number(year),
      rows.map((r) => ({ giverId: r.giverId, receiverId: r.receiverId }))
    );
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setShowForm(false);
    setRows([{ id: 1, giverId: "", receiverId: "" }]);
    setYear(String(currentYear - 1));
    router.refresh();
  }

  async function handleDelete(seasonId: string) {
    setDeletingId(seasonId);
    await deleteHistoricalSeason(seasonId);
    setDeletingId(null);
    router.refresh();
  }

  const selectClass =
    "px-2 py-1.5 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent";

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Historical Seasons</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Past pairings used to avoid repeats when generating new assignments.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition-colors"
          >
            Add season
          </button>
        )}
      </div>

      {/* Existing historical seasons */}
      {historicalSeasons.length > 0 && (
        <ul className="space-y-2">
          {historicalSeasons.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3">
              <div>
                <span className="text-sm font-semibold text-zinc-900">{s.year}</span>
                <span className="text-xs text-zinc-400 ml-2">{s.pairings.length} pairs</span>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingId === s.id ? "Deleting…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {historicalSeasons.length === 0 && !showForm && (
        <p className="text-sm text-zinc-400">No historical seasons added yet.</p>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-zinc-100">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-zinc-700 w-12 shrink-0">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min={2000}
              max={currentYear - 1}
              required
              className="w-28 px-3 py-1.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
              <span className="text-xs font-medium text-zinc-500">Giver</span>
              <span />
              <span className="text-xs font-medium text-zinc-500">Receiver</span>
              <span />
            </div>

            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                <select
                  value={row.giverId}
                  onChange={(e) => updateRow(row.id, "giverId", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName ?? u.name}
                    </option>
                  ))}
                </select>
                <span className="text-zinc-400 text-sm">→</span>
                <select
                  value={row.receiverId}
                  onChange={(e) => updateRow(row.id, "receiverId", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName ?? u.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="text-zinc-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                  aria-label="Remove row"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="text-sm text-red-700 hover:underline"
          >
            + Add pair
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Save season"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
