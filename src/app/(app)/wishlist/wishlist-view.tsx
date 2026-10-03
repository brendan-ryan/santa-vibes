"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ItemForm from "./item-form";
import { deleteItem, moveItem } from "./actions";

type WishlistItem = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  price: number | null;
  priority: "HIGH" | "NORMAL" | "LOW";
  displayOrder: number;
  imageUrl: string | null;
};

const priorityConfig = {
  HIGH: { label: "High priority", className: "bg-red-100 text-red-700" },
  NORMAL: { label: "On my list", className: "bg-zinc-100 text-zinc-500" },
  LOW: { label: "Nice to have", className: "bg-zinc-100 text-zinc-400" },
};

export default function WishlistView({ items }: { items: WishlistItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  function handleEdit(item: WishlistItem) {
    setEditItem(item);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditItem(null);
  }

  async function handleDelete(id: string) {
    await deleteItem(id);
    setConfirmDelete(null);
    router.refresh();
  }

  async function handleMove(id: string, direction: "up" | "down") {
    setMovingId(id);
    await moveItem(id, direction);
    startTransition(() => router.refresh());
    setMovingId(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">My Wishlist</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {items.length === 0
                ? "Add the things you'd love to receive"
                : `${items.length} item${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add item
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <div className="text-5xl mb-4">🎁</div>
            <p className="font-medium text-zinc-500">Your wishlist is empty</p>
            <p className="text-sm mt-1">Add items to help your Santa find the perfect gift.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 px-5 py-2.5 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition-colors"
            >
              Add your first item
            </button>
          </div>
        )}

        {/* Item list */}
        <ul className="space-y-3">
          {items.map((item, idx) => {
            const priority = priorityConfig[item.priority];
            const isDeleting = confirmDelete === item.id;
            const isMoving = movingId === item.id && isPending;

            return (
              <li
                key={item.id}
                className={`bg-white rounded-xl border border-zinc-200 p-4 transition-opacity ${isMoving ? "opacity-50" : ""}`}
              >
                {/* Top row: priority badge + price */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {priority && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${priority.className}`}
                      >
                        {priority.label}
                      </span>
                    )}
                    <h3 className="text-base font-semibold text-zinc-900 leading-snug">
                      {item.title}
                    </h3>
                  </div>
                  {item.price != null && (
                    <span className="text-sm font-semibold text-emerald-700 shrink-0">
                      ${item.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Photo */}
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

                {/* Description */}
                {item.description && (
                  <p className="text-sm text-zinc-500 mb-2 line-clamp-2">{item.description}</p>
                )}

                {/* URL */}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-3"
                  >
                    View item
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path d="M5.5 1H9v3.5M9 1 4 6M1 3h3v6H1V3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                )}

                {/* Delete confirm */}
                {isDeleting ? (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 mt-1">
                    <p className="text-sm text-red-700 mb-2">Remove this item?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-1.5 text-sm rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 py-1.5 text-sm rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action row */
                  <div className="flex items-center justify-between pt-1 mt-1 border-t border-zinc-100">
                    {/* Reorder buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMove(item.id, "up")}
                        disabled={idx === 0}
                        title="Move up"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMove(item.id, "down")}
                        disabled={idx === items.length - 1}
                        title="Move down"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <path d="M7 3v8M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>

                    {/* Edit / Delete */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Item form modal */}
      {showForm && (
        <ItemForm item={editItem ?? undefined} onClose={handleCloseForm} />
      )}
    </div>
  );
}
