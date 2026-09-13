import { IconClose, IconPin } from "./Icons";

type SearchSummaryProps = {
  summary: string;
  onClear: () => void;
};

/**
 * Displays the parsed search filters (category, location, price) with visual indicators.
 * Shows what the user's search query is actually filtering for.
 */
export function SearchSummary({ summary, onClear }: SearchSummaryProps) {
  if (!summary) {
    return null;
  }

  const parts = summary.split(" · ");

  return (
    <div className="search-summary">
      <div className="search-summary-content">
        {parts.map((part, i) => {
          const isLocationFilter = part.startsWith("near ");
          const isPriceFilter = part.startsWith("under R");

          return (
            <span key={i} className={`search-filter-tag ${isLocationFilter ? "location" : isPriceFilter ? "price" : "category"}`}>
              {isLocationFilter && <IconPin size={12} />}
              <span>{part}</span>
            </span>
          );
        })}
      </div>
      <button
        className="search-summary-clear"
        type="button"
        onClick={onClear}
        aria-label="Clear filters"
        title="Clear filters"
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}
