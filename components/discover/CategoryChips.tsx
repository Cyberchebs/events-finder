type Props = {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
};

export function CategoryChips({
  categories,
  selectedCategory,
  onSelectCategory,
}: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
      {categories.map((category) => {
        const isActive = category === selectedCategory;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(category)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              isActive
                ? "bg-brand text-brand-ink"
                : "border border-border bg-surface text-ink-2 hover:border-line-2"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}

