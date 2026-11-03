import Link from "next/link";
import { Home, Ticket, PlusCircle, User } from "lucide-react";

type Props = {
  currentTab?: "discover" | "tickets" | "create" | "profile" | "none";
};

export function BottomTabBar({ currentTab = "discover" }: Props) {
  return (
    <nav aria-label="Primary navigation" className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-surface px-4 py-2.5 shadow-sm md:hidden">
      <Link
        href="/"
        aria-current={currentTab === "discover" ? "page" : undefined}
        className={`flex h-9 w-12 items-center justify-center rounded-xl transition-colors ${
          currentTab === "discover" ? "bg-brand-soft text-brand" : "text-ink-3 hover:text-ink-2"
        }`}
        aria-label="Discover"
      >
        <Home className="h-5 w-5" />
      </Link>

      <Link
        href="/my-tickets"
        aria-current={currentTab === "tickets" ? "page" : undefined}
        className={`flex h-9 w-12 items-center justify-center rounded-xl transition-colors ${
          currentTab === "tickets" ? "bg-brand-soft text-brand" : "text-ink-3 hover:text-ink-2"
        }`}
        aria-label="My tickets"
      >
        <Ticket className="h-5 w-5" />
      </Link>

      <Link
        href="/onboarding/event?new=1"
        aria-current={currentTab === "create" ? "page" : undefined}
        className={`flex h-9 w-12 items-center justify-center rounded-xl transition-colors ${
          currentTab === "create" ? "bg-brand-soft text-brand" : "text-ink-3 hover:text-ink-2"
        }`}
        aria-label="Create event"
      >
        <PlusCircle className="h-5 w-5" />
      </Link>

      <Link
        href="/profile"
        aria-current={currentTab === "profile" ? "page" : undefined}
        className={`flex h-9 w-12 items-center justify-center rounded-xl transition-colors ${
          currentTab === "profile" ? "bg-brand-soft text-brand" : "text-ink-3 hover:text-ink-2"
        }`}
        aria-label="Profile"
      >
        <User className="h-5 w-5" />
      </Link>
    </nav>
  );
}
