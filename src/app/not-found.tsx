import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🤷</p>
        <h1 className="text-xl font-bold text-zinc-900 mb-1">Page not found</h1>
        <p className="text-sm text-zinc-500 mb-6">That page doesn't exist.</p>
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-red-700 hover:underline"
        >
          Go home →
        </Link>
      </div>
    </div>
  );
}
