import {
  BriefcaseBusiness,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  HandHeart,
  LayoutGrid,
  Music,
  Palette,
  PartyPopper,
  Sparkles,
  Theater,
  UtensilsCrossed,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { EVENT_CATEGORIES } from "@/lib/constants";

type CategoryItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const CATEGORY_ICONS: Record<(typeof EVENT_CATEGORIES)[number], LucideIcon> = {
  "Music & Concerts": Music,
  "Comedy & Performing Arts": Theater,
  "Fan Culture & Conventions": UsersRound,
  "Gaming & Esports": Gamepad2,
  "Festivals & Culture": Sparkles,
  "Food & Drink": UtensilsCrossed,
  "Parties & Nightlife": PartyPopper,
  "Sports & Fitness": Dumbbell,
  "Tech & Business": BriefcaseBusiness,
  "Arts, Film & Fashion": Palette,
  "Workshops & Learning": GraduationCap,
  "Family, Faith & Causes": HandHeart,
};

export const CATEGORIES: CategoryItem[] = [
  { id: "All", label: "All events", icon: LayoutGrid },
  ...EVENT_CATEGORIES.map((category) => ({
    id: category,
    label: category,
    icon: CATEGORY_ICONS[category],
  })),
];

type Props = {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
};

export function CategorySidebar({
  selectedCategory,
  onSelectCategory,
}: Props) {
  return (
    <aside className="w-52 shrink-0 border-r border-border pr-4 py-4">
      <div className="px-3 pb-2 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-3">
        Categories
      </div>
      <nav className="space-y-1">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isActive =
            selectedCategory === category.id ||
            (category.id === "All" && selectedCategory === "All events");

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left ${
                isActive
                  ? "rounded-l-lg bg-brand-soft font-bold text-brand border-r-2 border-brand"
                  : "rounded-lg font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{category.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
