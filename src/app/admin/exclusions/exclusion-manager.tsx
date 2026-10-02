"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addExclusion, removeExclusion } from "./actions";

type User = { id: string; name: string; displayName: string | null };
type Exclusion = { id: string; userA: User; userB: User };

function displayName(u: User) {
  return u.displayName ?? u.name;
}

export default function ExclusionManager({
  exclusions,
  users,
}: {
  exclusions: Exclusion[];
  users: User[];
}) {
  const router = useRouter();
  const [userAId, setUserAId] = useState("");
  const [userBId, setUserBId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!userAId || !userBId) return;
    setLoading(true);
    setError("");
    const result = await addExclusion(userAId, userBId);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      setUserAId("");
      setUserBId("");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRemove(id: string) {
    await removeExclusion(id);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {exclusions.map((ex) => (
        <div
          key={ex.id}
          className="bg-white rounded-lg border border-zinc-200 px-4 py-3 flex items-center justify-between"
        >
          <span className="text-sm text-zinc-800">
            {displayName(ex.userA)}{" "}
            <span className="text-zinc-400">&amp;</span>{" "}
            {displayName(ex.userB)}
          </span>
          <button
            onClick={() => handleRemove(ex.id)}
            className="text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        </div>
      ))}

      {exclusions.length === 0 && (
        <p className="text-sm text-zinc-500 py-2">No couple exclusions set.</p>
      )}

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-32">
          <label className="block text-xs font-medium text-zinc-600 mb-1">Person A</label>
          <select
            value={userAId}
            onChange={(e) => setUserAId(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-700 bg-white"
          >
            <option value="">Select…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {displayName(u)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-32">
          <label className="block text-xs font-medium text-zinc-600 mb-1">Person B</label>
          <select
            value={userBId}
            onChange={(e) => setUserBId(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-700 bg-white"
          >
            <option value="">Select…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {displayName(u)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || !userAId || !userBId || userAId === userBId}
          className="px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
