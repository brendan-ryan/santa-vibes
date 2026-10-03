"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { selectItem, deselectItem, setSelectionStatus } from "./actions";

type WishlistItem = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  price: number | null;
  priority: "HIGH" | "NORMAL" | "LOW";
  imageUrl: string | null;
};

type Selection = {
  id: string;
  itemId: string;
  status: "PLANNING" | "PURCHASED";
};

type Partner = {
  id: string;
  name: string;
  displayName: string | null;
};

type Props = {
  pairingId: string;
  partner: Partner;
  items: WishlistItem[];
  selectionMap: Record<string, Selection>;
  budget: number | null;
  isTest: boolean;
};

const priorityConfig = {
  HIGH: { label: "High priority", className: "bg-red-100 text-red-700" },
  NORMAL: { label: "On my list", className: "bg-zinc-100 text-zinc-500" },
  LOW: { label: "Nice to have", className: "bg-zinc-100 text-zinc-400" },
};

export default function PartnerWishlist({
  pairingId,
  partner,
  items,
  selectionMap: initialSelectionMap,
  budget,
  isTest,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [selectionMap, setSelectionMap] = useState(initialSelectionMap);

  const partnerName = partner.displayName ?? partner.name;

  const plannedCount = Object.values(selectionMap).filter(
    (s) => s.status === "PLANNING"
  ).length;
  const purchasedCount = Object.values(selectionMap).filter(
    (s) => s.status === "PURCHASED"
  ).length;

  async function handleSelect(itemId: string) {
    setLoadingItemId(itemId);
    const result = await selectItem(pairingId, itemId);
    if ("success" in result) {
      setSelectionMap((prev) => ({
        ...prev,
        [itemId]: { id: "", itemId, status: "PLANNING" },
      }));
      startTransition(() => router.refresh());
    }
    setLoadingItemId(null);
  }

  async function handleDeselect(itemId: string) {
    setLoadingItemId(itemId);
    const result = await deselectItem(pairingId, itemId);
    if ("success" in result) {
      setSelectionMap((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      startTransition(() => router.refresh());
    }
    setLoadingItemId(null);
  }

  async function handleTogglePurchased(itemId: string, current: "PLANNING" | "PURCHASED") {
    const next = current === "PLANNING" ? "PURCHASED" : "PLANNING";
    setLoadingItemId(itemId);
    const result = await setSelectionStatus(pairingId, itemId, next);
    if ("success" in result) {
      setSelectionMap((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], status: next },
      }));
      startTransition(() => router.refresh());
    }
    setLoadingItemId(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-zinc-900">
              {partnerName}&apos;s Wishlist
            </h1>
            {isTest && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                Test
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            You&apos;re their Secret Santa this year
            {budget != null ? ` · Budget: $${budget.toFixed(2)}` : ""}
          </p>

          {/* Planning summary */}
          {Object.keys(selectionMap).length > 0 && (
            <div className="mt-3 flex gap-3 text-sm">
              {plannedCount > 0 && (
                <span className="text-blue-700 font-medium">
                  {plannedCount} planning to get
                </span>
              )}
              {purchasedCount > 0 && (
                <span className="text-emerald-700 font-medium">
                  {purchasedCount} purchased
                </span>
              )}
            </div>
          )}
        </div>

        {/* Empty wishlist */}
        {items.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <div className="text-5xl mb-4">🎁</div>
            <p className="font-medium text-zinc-500">
              {partnerName} hasn&apos;t added anything yet
            </p>
            <p className="text-sm mt-1">Check back later, or surprise them!</p>
          </div>
        )}

        {/* Item list */}
        <ul className="space-y-3">
          {items.map((item) => {
            const selection = selectionMap[item.id];
            const priority = priorityConfig[item.priority];
            const isLoading = loadingItemId === item.id;
            const isPurchased = selection?.status === "PURCHASED";
            const isPlanning = selection?.status === "PLANNING";

            return (
              <li
                key={item.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  isPurchased
                    ? "border-emerald-200 bg-emerald-50/40"
                    : isPlanning
                    ? "border-blue-200"
                    : "border-zinc-200"
                }`}
              >
                {/* Top: priority + title + price */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {priority && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${priority.className}`}
                      >
                        {priority.label}
                      </span>
                    )}
                    <h3
                      className={`text-base font-semibold leading-snug ${
                        isPurchased ? "text-zinc-400 line-through" : "text-zinc-900"
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>
                  {item.price != null && (
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        isPurchased ? "text-zinc-400" : "text-emerald-700"
                      }`}
                    >
                      ${item.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {item.imageUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-zinc-100">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      width={400}
                      height={160}
                      className="w-full h-40 object-cover"
                      unoptimized
                    />
                  </div>
                )}

                {item.description && (
                  <p className="text-sm text-zinc-500 mb-2 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-3"
                  >
                    View item
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path
                        d="M5.5 1H9v3.5M9 1 4 6M1 3h3v6H1V3z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                )}

                {/* Selection controls */}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-100">
                  {!selection ? (
                    <button
                      onClick={() => handleSelect(item.id)}
                      disabled={isLoading || isPending}
                      className="text-sm font-medium text-zinc-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? "Saving…" : "+ I'll get this"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Purchased toggle */}
                      <button
                        onClick={() =>
                          handleTogglePurchased(item.id, selection.status)
                        }
                        disabled={isLoading || isPending}
                        className={`flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 transition-colors ${
                          isPurchased
                            ? "text-emerald-700"
                            : "text-blue-700"
                        }`}
                      >
                        <span
                          className={`inline-flex w-4 h-4 rounded border items-center justify-center text-xs ${
                            isPurchased
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-blue-100 border-blue-400 text-blue-700"
                          }`}
                        >
                          ✓
                        </span>
                        {isLoading
                          ? "Saving…"
                          : isPurchased
                          ? "Purchased"
                          : "Planning to get"}
                      </button>
                    </div>
                  )}

                  {/* Remove from plan */}
                  {selection && (
                    <button
                      onClick={() => handleDeselect(item.id)}
                      disabled={isLoading || isPending}
                      className="text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-50 transition-colors"
                    >
                      Remove from plan
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
