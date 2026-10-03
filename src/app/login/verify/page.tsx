import Link from "next/link";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="text-5xl">📬</div>
        <h1 className="text-2xl font-bold text-zinc-900">Check your email</h1>
        <p className="text-zinc-600">
          A sign-in link has been sent to your email address. Click the link to sign in.
        </p>
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left">
          <p className="text-sm font-medium text-amber-800">Can&apos;t find the email?</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Check your <span className="font-semibold">Junk</span> or{" "}
            <span className="font-semibold">Spam</span> folder — magic link emails sometimes
            land there on first delivery.
          </p>
        </div>
        <p className="text-xs text-zinc-400">The link expires in 24 hours.</p>
        <Link href="/login" className="inline-block text-sm text-red-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
