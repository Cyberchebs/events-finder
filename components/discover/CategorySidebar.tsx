import {
  LayoutGrid,
  Music,
  Trophy,
  Laugh,
  Moon,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

type CategoryItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const CATEGORIES: CategoryItem[] = [
  { id: "All", label: "All events", icon: LayoutGrid },
  { id: "Music", label: "Music", icon: Music },
  { id: "Sports", label: "Sports", icon: Trophy },
  { id: "Comedy", label: "Comedy", icon: Laugh },
  { id: "Nightlife", label: "Nightlife", icon: Moon },
  { id: "Business", label: "Business", icon: Briefcase },
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

