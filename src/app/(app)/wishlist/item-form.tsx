"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createItem, updateItem } from "./actions";

type WishlistItem = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  price: number | null;
  priority: "HIGH" | "NORMAL" | "LOW";
  imageUrl: string | null;
};

type Props = {
  item?: WishlistItem;
  onClose: () => void;
};

export default function ItemForm({ item, onClose }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/wishlist/upload", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) {
      setUploadError(json.error ?? "Upload failed");
    } else {
      setImageUrl(json.url);
    }
    setUploading(false);
    // reset so the same file can be re-selected
    e.target.value = "";
  }

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
            {/* Hidden field carries the uploaded URL */}
            <input type="hidden" name="imageUrl" value={imageUrl} />

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                What do you want?
              </label>
              <input
                name="title"
                defaultValue={item?.title}
                required
                placeholder="e.g. cozy robe, Lego Technic set, warm blanket…"
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
                Photo{" "}
                <span className="text-zinc-400 font-normal">(optional)</span>
              </label>

              {imageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    width={400}
                    height={160}
                    className="w-full h-40 object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                    aria-label="Remove photo"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 disabled:opacity-50 transition-colors"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M8 3v8M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Add a photo
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFile}
              />
              {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
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
                disabled={loading || uploading}
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
