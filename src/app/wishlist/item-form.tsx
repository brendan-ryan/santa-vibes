"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createItem, updateItem } from "./actions";

type WishlistItem = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  price: number | null;
  priority: "HIGH" | "NORMAL" | "LOW";
};

type Props = {
  item?: WishlistItem;
  onClose: () => void;
};

export default function ItemForm({ item, onClose }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = item
      ? await updateItem(item.id, formData)
      : await createItem(formData);

    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
      onClose();
    }
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
            {item ? "Edit item" : "Add wishlist item"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                What do you want?
              </label>
              <input
                name="title"
                defaultValue={item?.title}
                required
                placeholder="e.g. Lego Technic set, cozy robe, gift card…"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Description{" "}
                <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                name="description"
                defaultValue={item?.description ?? ""}
                rows={3}
                placeholder="Specific details, size, colour, model number…"
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Link{" "}
                <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                name="url"
                defaultValue={item?.url ?? ""}
                placeholder="https://amazon.com/…"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Price{" "}
                <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
                  $
                </span>
                <input
                  type="number"
                  name="price"
                  defaultValue={item?.price ?? ""}
                  min="0.01"
                  step="0.01"
                  placeholder="49.99"
                  className={`${inputClass} pl-7`}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Adding a price helps your Santa stay on budget.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Priority
              </label>
              <select
                name="priority"
                defaultValue={item?.priority ?? "NORMAL"}
                className={`${inputClass} bg-white`}
              >
                <option value="HIGH">High — really want this</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low — nice to have</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving…" : item ? "Save changes" : "Add item"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
