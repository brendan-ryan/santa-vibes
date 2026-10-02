import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const navLinks = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/pairings", label: "Pairings" },
  { href: "/admin/exclusions", label: "Exclusions" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700">
              ← App
            </Link>
            <span className="text-zinc-300">|</span>
            <span className="text-sm font-semibold text-zinc-900">Admin</span>
          </div>
          <nav className="flex gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
