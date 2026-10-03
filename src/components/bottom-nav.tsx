"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H14v-5h-4v5H4a1 1 0 0 1-1-1V9.5z"
        stroke="currentColor"
        strokeWidth={active ? "2" : "1.6"}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? "0.15" : "0"}
      />
    </svg>
  );
}

function GiftIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="2" y="9" width="18" height="11" rx="1" stroke="currentColor" strokeWidth={active ? "2" : "1.6"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
      <path d="M11 9v11M2 13h18" stroke="currentColor" strokeWidth={active ? "2" : "1.6"} strokeLinecap="round" />
      <path d="M11 9H6.5a2.5 2.5 0 0 1 0-5C9 4 11 9 11 9zM11 9h4.5a2.5 2.5 0 0 0 0-5C13 4 11 9 11 9z" stroke="currentColor" strokeWidth={active ? "2" : "1.6"} strokeLinejoin="round" />
    </svg>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth={active ? "2" : "1.6"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
      <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" stroke="currentColor" strokeWidth={active ? "2" : "1.6"} strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M4 4h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H7l-4 3V5a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth={active ? "2" : "1.6"}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? "0.15" : "0"}
      />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/wishlist", label: "Wishlist", Icon: GiftIcon },
  { href: "/partner", label: "Recipient", Icon: PersonIcon },
  { href: "/messages", label: "Messages", Icon: ChatIcon },
];

export default function BottomNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-40">
      <div className="flex max-w-lg mx-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                isActive ? "text-red-700" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <div className="relative">
                <Icon active={isActive} />
                {href === "/messages" && unreadCount > 0 && !pathname.startsWith("/messages") && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-red-700 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
