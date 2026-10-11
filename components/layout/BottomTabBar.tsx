import Link from "next/link";
import { Home, Ticket, PlusCircle, User } from "lucide-react";

type Props = {
  currentTab?: "discover" | "tickets" | "create" | "profile";
};

export function BottomTabBar({ currentTab = "discover" }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-surface py-2.5 md:hidden shadow-sm">
      <Link
        href="/"
        className={`flex h-8 w-8 items-center justify-center transition-colors ${
          currentTab === "discover" ? "text-brand" : "text-ink-3 hover:text-ink-2"
        }`}
        aria-label="Discover"
      >
        <Home className="h-5 w-5" />
      </Link>

      <Link
        href="/my-tickets"
        className={`flex h-8 w-8 items-center justify-center transition-colors ${
          currentTab === "tickets" ? "text-brand" : "text-ink-3 hover:text-ink-2"
        }`}
        aria-label="My tickets"
      >
        <Ticket className="h-5 w-5" />
      </Link>

      <Link
        href="/onboarding/profile"
        className={`flex h-8 w-8 items-center justify-center transition-colors ${
          currentTab === "create" ? "text-brand" : "text-ink-3 hover:text-ink-2"
        }`}
        aria-label="Create event"
      >
        <PlusCircle className="h-5 w-5" />
      </Link>

      <Link
        href="/profile"
        className={`flex h-8 w-8 items-center justify-center transition-colors ${
          currentTab === "profile" ? "text-brand" : "text-ink-3 hover:text-ink-2"
        }`}
        aria-label="Profile"
      >
        <User className="h-5 w-5" />
      </Link>
    </nav>
  );
}

