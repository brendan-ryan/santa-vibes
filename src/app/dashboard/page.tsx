import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const name = session.user?.name ?? session.user?.email ?? "there";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-900">Welcome, {name} 🎄</h1>
        <p className="mt-2 text-zinc-600">Dashboard coming soon.</p>
      </div>
    </div>
  );
}
