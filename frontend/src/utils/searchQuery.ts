/**
 * Smart search query parsing for category, location, and price filters.
 * Supports natural language like "braids near Sandton under R500"
 */

const categoryAliases: Record<string, string> = {
  bridal: "Bridal",
  wedding: "Bridal",
  weddings: "Bridal",
  bride: "Bridal",
  bridesmaid: "Bridal",
  braid: "Hair",
  braids: "Hair",
  hair: "Hair",
  nails: "Nails",
  nail: "Nails",
  manicure: "Nails",
  pedicure: "Nails",
  barber: "Barbering",
  barbers: "Barbering",
  barbering: "Barbering",
  makeup: "Makeup",
  skincare: "Skincare",
  facial: "Skincare",
  facials: "Skincare",
  tattoo: "Tattoos",
  tattoos: "Tattoos",
  lashes: "Lashes & Brows",
  lash: "Lashes & Brows",
  brows: "Lashes & Brows",
  brow: "Lashes & Brows",
  loc: "Locs & Dreadlocks",
  locs: "Locs & Dreadlocks",
  dreadlock: "Locs & Dreadlocks",
  dreadlocks: "Locs & Dreadlocks",
  wig: "Wigs & Weaves",
  wigs: "Wigs & Weaves",
  weave: "Wigs & Weaves",
  weaves: "Wigs & Weaves",
  natural: "Natural Hair",
  "natural hair": "Natural Hair",
  spa: "Spa & Wellness",
  wellness: "Spa & Wellness",
  massage: "Massage",
  waxing: "Waxing & Hair Removal",
  piercing: "Piercing",
  "teeth whitening": "Teeth Whitening",
  aesthetics: "Aesthetics & Injectables",
  injectables: "Aesthetics & Injectables",
  "men's grooming": "Men's Grooming",
  "beauty courses": "Beauty Courses",
};

const searchStopWords = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "near",
  "the",
  "under",
  "below",
  "less",
  "than",
]);

export type SmartQuery = {
  category?: string;
  location?: string;
  maxPrice?: number;
  searchTerms: string[];
};

/**
 * Parse a search query into structured filters and search terms
 * Examples:
 *  - "braids" → category: Hair
 *  - "braids near Sandton" → category: Hair, location: Sandton
 *  - "makeup under R300" → category: Makeup, maxPrice: 300
 *  - "braids near Sandton under R500" → all three filters
 */
export function parseSmartQuery(query: string): SmartQuery {
  const normalizedQuery = query.trim().toLowerCase();

  const categoryToken = normalizedQuery.match(
    /\b(natural hair|bridal|bride|bridesmaid|weddings?|braids?|hair|nails?|manicure|pedicure|barber(?:ing|s)?|makeup|skincare|facials?|tattoos?|lashes?|brows?|locs?|dreadlocks?|wigs?|weaves?|spa|wellness|massage|waxing|piercing|teeth whitening|aesthetics|injectables|men's grooming|beauty courses)\b/,
  );

  const priceMatch = normalizedQuery.match(
    /(?:under|below|less than)\s*r?\s*(\d+(?:\.\d+)?)/,
  );

  const nearMatch = normalizedQuery.match(
    /\bnear\s+([a-z][a-z\s-]*?)(?=\s+(?:under|below|less than)\b|$)/,
  );

  const category = categoryToken ? categoryAliases[categoryToken[1]] : undefined;
  const location = nearMatch?.[1].trim();

  const searchTerms = normalizedQuery
    .replace(categoryToken?.[0] || "", "")
    .replace(priceMatch?.[0] || "", "")
    .replace(nearMatch?.[0] || "", "")
    .split(/\s+/)
    .filter((term) => term && !searchStopWords.has(term));

  return {
    category,
    location,
    maxPrice: priceMatch ? Number(priceMatch[1]) : undefined,
    searchTerms,
  };
}

/**
 * Format a SmartQuery back into a readable summary string
 * Example: "Hair · near Sandton · under R500"
 */
export function formatSearchSummary(query: SmartQuery): string {
  return [
    query.category,
    query.location && `near ${query.location}`,
    query.maxPrice != null && `under R${query.maxPrice}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
