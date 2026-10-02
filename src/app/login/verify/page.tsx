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
        <p className="text-sm text-zinc-500">
          The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
        </p>
        <Link href="/login" className="inline-block text-sm text-red-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
