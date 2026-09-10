// Category pill slider — rose-gold active indicator, skeleton during load.

type CategoryTabsProps = {
  activeCategory: string;
  categories: string[];
  isLoading: boolean;
  onSelectCategory: (category: string) => void;
};

const SKELETON_COUNT = 6;

function CategoryTabs({ activeCategory, categories, isLoading, onSelectCategory }: CategoryTabsProps) {
  const allCategories = ["For you", ...categories];

  if (isLoading) {
    return (
      <div className="cat-tabs-scroll">
        <div className="cat-tabs-row">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="cat-tab-skeleton skeleton" style={{ width: `${60 + i * 12}px` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cat-tabs-scroll">
      <div className="cat-tabs-row" role="tablist" aria-label="Content categories">
        {allCategories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              className={`cat-tab-pill${isActive ? " active" : ""}`}
              onClick={() => onSelectCategory(cat)}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryTabs;
