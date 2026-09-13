import { useState } from "react";
import { IconChevronRight, IconClose } from "./Icons";
import type { Post } from "../types";

type FilterPanelProps = {
  posts: Post[];
  categories: string[];
  onCategoryChange: (category: string) => void;
  selectedCategory: string;
  priceRange: { min: number; max: number };
  onPriceRangeChange: (min: number, max: number) => void;
  onLocationChange: (location: string) => void;
  selectedLocation: string;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
};

/**
 * Desktop filter panel for faceted search
 * Shown on desktop (>1100px), hidden on mobile
 * Allows filtering by: category, price, location, availability
 */
export function DesktopFilterPanel({
  posts,
  categories,
  onCategoryChange,
  selectedCategory,
  priceRange,
  onPriceRangeChange,
  onLocationChange,
  selectedLocation,
  isOpen,
  onToggle,
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    location: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Calculate faceted counts (how many posts in each category)
  const categoryCounts = categories.reduce(
    (acc, cat) => {
      acc[cat] = posts.filter((p) => p.category === cat).length;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate unique locations
  const locationCounts = posts.reduce(
    (acc, post) => {
      const location = post.location || "Unknown";
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate price range from posts
  const maxPostPrice = Math.max(...posts.map((p) => Number(p.price) || 0), 1000);
  const minPostPrice = Math.min(...posts.map((p) => Number(p.price) || 0), 0);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="filter-panel-toggle-mobile"
        onClick={() => onToggle(!isOpen)}
        aria-label="Toggle filters"
      >
        Filters
        <span style={{ display: "inline-flex", transform: isOpen ? "rotate(90deg)" : "", transition: "transform 0.2s" }}>
          <IconChevronRight size={18} />
        </span>
      </button>

      {/* Filter panel */}
      <aside
        className={`desktop-filter-panel ${isOpen ? "open" : ""}`}
        role="region"
        aria-label="Search filters"
      >
        {/* Header with close button */}
        <div className="filter-panel-header">
          <h2 className="filter-panel-title">Filters</h2>
          <button
            className="filter-panel-close"
            onClick={() => onToggle(false)}
            aria-label="Close filters"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Filters content */}
        <div className="filter-panel-content">
          {/* Category filter */}
          <section className="filter-section">
            <button
              className="filter-section-header"
              onClick={() => toggleSection("category")}
              aria-expanded={expandedSections.category}
            >
              <h3 className="filter-section-title">Category</h3>
              <span style={{
                display: "inline-flex",
                transform: expandedSections.category ? "rotate(90deg)" : "",
                transition: "transform 0.2s",
              }}>
                <IconChevronRight size={16} />
              </span>
            </button>

            {expandedSections.category && (
              <div className="filter-options">
                <label className="filter-option">
                  <input
                    type="radio"
                    name="category"
                    value="all"
                    checked={selectedCategory === "For you"}
                    onChange={() => onCategoryChange("For you")}
                  />
                  <span className="filter-label">All ({posts.length})</span>
                </label>

                {categories.map((cat) => (
                  <label key={cat} className="filter-option">
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={selectedCategory === cat}
                      onChange={() => onCategoryChange(cat)}
                    />
                    <span className="filter-label">
                      {cat}
                      <span className="filter-count">({categoryCounts[cat] || 0})</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Price filter */}
          <section className="filter-section">
            <button
              className="filter-section-header"
              onClick={() => toggleSection("price")}
              aria-expanded={expandedSections.price}
            >
              <h3 className="filter-section-title">Price Range</h3>
              <span style={{
                display: "inline-flex",
                transform: expandedSections.price ? "rotate(90deg)" : "",
                transition: "transform 0.2s",
              }}>
                <IconChevronRight size={16} />
              </span>
            </button>

            {expandedSections.price && (
              <div className="filter-price-range">
                <div className="price-inputs">
                  <input
                    type="number"
                    className="price-input"
                    placeholder="Min"
                    min={minPostPrice}
                    max={maxPostPrice}
                    value={priceRange.min}
                    onChange={(e) => onPriceRangeChange(Number(e.target.value), priceRange.max)}
                  />
                  <span className="price-separator">-</span>
                  <input
                    type="number"
                    className="price-input"
                    placeholder="Max"
                    min={minPostPrice}
                    max={maxPostPrice}
                    value={priceRange.max}
                    onChange={(e) => onPriceRangeChange(priceRange.min, Number(e.target.value))}
                  />
                </div>

                {/* Preset price ranges */}
                <div className="price-presets">
                  <button
                    className="price-preset"
                    onClick={() => onPriceRangeChange(0, 500)}
                  >
                    Under R500
                  </button>
                  <button
                    className="price-preset"
                    onClick={() => onPriceRangeChange(500, 1000)}
                  >
                    R500 - R1000
                  </button>
                  <button
                    className="price-preset"
                    onClick={() => onPriceRangeChange(1000, maxPostPrice)}
                  >
                    Over R1000
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Location filter */}
          <section className="filter-section">
            <button
              className="filter-section-header"
              onClick={() => toggleSection("location")}
              aria-expanded={expandedSections.location}
            >
              <h3 className="filter-section-title">Location</h3>
              <span style={{
                display: "inline-flex",
                transform: expandedSections.location ? "rotate(90deg)" : "",
                transition: "transform 0.2s",
              }}>
                <IconChevronRight size={16} />
              </span>
            </button>

            {expandedSections.location && (
              <div className="filter-options">
                <label className="filter-option">
                  <input
                    type="radio"
                    name="location"
                    value=""
                    checked={selectedLocation === ""}
                    onChange={() => onLocationChange("")}
                  />
                  <span className="filter-label">All Locations</span>
                </label>

                {Object.entries(locationCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([location, count]) => (
                    <label key={location} className="filter-option">
                      <input
                        type="checkbox"
                        value={location}
                        checked={selectedLocation === location}
                        onChange={() =>
                          onLocationChange(selectedLocation === location ? "" : location)
                        }
                      />
                      <span className="filter-label">
                        {location}
                        <span className="filter-count">({count})</span>
                      </span>
                    </label>
                  ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer with clear filters button */}
        <div className="filter-panel-footer">
          <button
            className="filter-clear-button"
            onClick={() => {
              onCategoryChange("For you");
              onPriceRangeChange(0, maxPostPrice);
              onLocationChange("");
            }}
          >
            Clear all filters
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="filter-panel-backdrop"
          onClick={() => onToggle(false)}
          role="presentation"
        />
      )}
    </>
  );
}
