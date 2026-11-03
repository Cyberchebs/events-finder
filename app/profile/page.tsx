import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Ticket } from "lucide-react";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Navbar } from "@/components/layout/Navbar";
import { ProfileSignOutButton } from "@/components/profile/ProfileSignOutButton";
import { ProfileThemeToggle } from "@/components/profile/ProfileThemeToggle";
import { createClient } from "@/utils/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[profile:page] user lookup failed", authError);
  }
  if (!user) {
    redirect("/login?next=%2Fprofile");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_organizer, organizer_name, organizer_bio")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[profile:page] profile lookup failed", profileError);
    throw new Error("Unable to load your profile.");
  }

  const isOrganizer = profile?.is_organizer === true;
  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  const emailName = user.email?.split("@")[0].replace(/[._-]+/g, " ");
  const displayName =
    profile?.organizer_name ||
    (typeof metadataName === "string" ? metadataName : null) ||
    emailName ||
    "Tik-Booth member";
  const avatarLabel = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar currentPath="/profile" />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-6 pb-24 sm:px-6 md:py-9 md:pb-12">
        <header className="mb-6">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-ink-3">
            A little more you
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">
            Profile
          </h1>
          <p className="mt-1 text-[12px] font-medium text-ink-2">
            Your details and your kind of good time.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand-line bg-brand-soft text-[16px] font-extrabold text-brand">
                  {avatarLabel}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-extrabold text-ink">
                    {displayName}
                  </h2>
                  <p className="mt-1 truncate text-[11px] font-medium text-ink-2">
                    {user.email}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[10px] font-extrabold uppercase tracking-wide text-ink">
                  Account
                </h2>
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[9px] font-extrabold text-brand">
                  {isOrganizer ? "ORGANIZER" : "ATTENDEE"}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-medium leading-5 text-ink-2">
                {isOrganizer && profile?.organizer_bio
                  ? profile.organizer_bio
                  : "Your tickets and event plans are always close by."}
              </p>
              {isOrganizer ? (
                <Link
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line-2 bg-surface px-4 text-[11px] font-bold text-ink transition-colors hover:bg-surface-2"
                  href="/dashboard"
                >
                  Open organizer dashboard
                  <ArrowRight aria-hidden="true" className="h-4 w-4 text-brand" />
                </Link>
              ) : (
                <Link
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line-2 bg-surface px-4 text-[11px] font-bold text-ink transition-colors hover:bg-surface-2"
                  href="/onboarding/profile"
                >
                  Become an organizer
                  <ArrowRight aria-hidden="true" className="h-4 w-4 text-brand" />
                </Link>
              )}
            </section>
          </div>

          <section>
            <h2 className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wide text-ink">
              Account settings
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface px-4 md:px-5">
              <Link
                className="flex items-center gap-3 border-b border-border py-4 transition-colors hover:text-brand"
                href="/my-tickets"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Ticket aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-bold text-ink">My tickets</span>
                  <span className="mt-1 block text-[10px] font-medium text-ink-3">
                    Your event passes and entry codes.
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 text-ink-3" />
              </Link>
              <div className="flex items-center gap-3 border-b border-border py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <BadgeCheck aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-bold text-ink">Account access</span>
                  <span className="mt-1 block truncate text-[10px] font-medium text-ink-3">
                    Signed in as {user.email}
                  </span>
                </span>
              </div>
              <ProfileThemeToggle />
              <div className="py-2">
                <ProfileSignOutButton />
              </div>
            </div>
          </section>
        </div>

      </main>
      <BottomTabBar currentTab="profile" />
    </div>
  );
}
