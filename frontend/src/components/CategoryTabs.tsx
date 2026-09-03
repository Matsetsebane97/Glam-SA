// Presents the service categories used to filter the feed.
type CategoryTabsProps = {
  activeCategory: string;
  categories: string[];
  isLoading: boolean;
  onSelectCategory: (category: string) => void;
};

function CategoryTabs({ activeCategory, categories, isLoading, onSelectCategory }: CategoryTabsProps) {
  const displayCategories = categories.length > 0 ? categories : ["For you", "Hair", "Nails", "Barbering", "Makeup", "Skincare", "Tattoos"];

  return (
    <div className="category-scroll-container">
      <div className="category-row" role="tablist" aria-label="Style Categories">
        {(isLoading ? ["Loading categories..."] : displayCategories).map((category) => {
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              disabled={isLoading}
              role="tab"
              aria-selected={isActive}
              className={`category-pill ${isActive ? "active" : ""}`}
              onClick={() => onSelectCategory(category)}
              type="button"
            >
              <span className="category-name">{category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryTabs;
