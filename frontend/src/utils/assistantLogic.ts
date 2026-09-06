// Assistant NLP logic, artist matching, and formatting utilities.
// All functions here are pure (no React) and are shared by AssistantPanel.
import type { AvailabilitySlot, NearbyArtist, Post, ServiceOffering } from "../types";
import type { CurrentUser } from "../types";
import { getNearbyArtists } from "../api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArtistMatch = {
  id: string;
  ownerId?: number;
  postId?: number;
  preferredWeekday?: number;
  preferredDateLabel?: string;
  name: string;
  handle: string;
  service?: string;
  category?: string;
  location?: string;
  whatsappNumber?: string;
  distanceKm?: number;
  minPrice?: number;
  maxPrice?: number;
  resultCount: number;
};

export type ParsedQuestion = {
  category?: string;
  location?: string;
  maxPrice?: number;
  searchTerms: string[];
  wantsNearby: boolean;
  preferredWeekday?: number;
  preferredDateLabel?: string;
};

export type ChatMessage = {
  id: number;
  author: "assistant" | "user";
  text: string;
  matches?: ArtistMatch[];
  quickReplies?: string[];
  fullResultCount?: number;
  fullResultQuery?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const categoryAliases: Record<string, string> = {
  braid: "Hair",
  braids: "Hair",
  hair: "Hair",
  nail: "Nails",
  nails: "Nails",
  manicure: "Nails",
  pedicure: "Nails",
  barber: "Barbering",
  barbers: "Barbering",
  barbering: "Barbering",
  makeup: "Makeup",
  facial: "Skincare",
  skincare: "Skincare",
  tattoo: "Tattoos",
  tattoos: "Tattoos",
};

export const assistantSuggestions = ["Hair near me", "Nails under R500", "Makeup in Sandton", "Find artist Naledi"];
export const fallbackSuggestions = ["Try a broader budget", "Search another area", "Browse the full feed"];
export const recentSearchesKey = "glamAssistantRecentSearches";
export const savedArtistsKey = "glamAssistantSavedArtists";

export const searchStopWords = new Set([
  "a", "an", "appointment", "artist", "artists", "beauty", "book", "booking",
  "find", "for", "in", "look", "looks", "me", "near", "nearby", "next",
  "please", "session", "show", "the", "than", "this", "to", "under", "below", "less",
]);

export const weekdayAliases: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// ─── NLP Helpers ──────────────────────────────────────────────────────────────

function getEditDistance(firstValue: string, secondValue: string) {
  const distances = Array.from({ length: firstValue.length + 1 }, (_, firstIndex) =>
    Array.from({ length: secondValue.length + 1 }, (_, secondIndex) => firstIndex + secondIndex),
  );

  for (let firstIndex = 0; firstIndex <= firstValue.length; firstIndex += 1) distances[firstIndex][0] = firstIndex;
  for (let secondIndex = 0; secondIndex <= secondValue.length; secondIndex += 1) distances[0][secondIndex] = secondIndex;

  for (let firstIndex = 1; firstIndex <= firstValue.length; firstIndex += 1) {
    for (let secondIndex = 1; secondIndex <= secondValue.length; secondIndex += 1) {
      const cost = firstValue[firstIndex - 1] === secondValue[secondIndex - 1] ? 0 : 1;
      distances[firstIndex][secondIndex] = Math.min(
        distances[firstIndex - 1][secondIndex] + 1,
        distances[firstIndex][secondIndex - 1] + 1,
        distances[firstIndex - 1][secondIndex - 1] + cost,
      );
    }
  }

  return distances[firstValue.length][secondValue.length];
}

function isFuzzyMatch(term: string, candidate: string) {
  if (!term || !candidate) return false;
  if (candidate.includes(term) || term.includes(candidate)) return true;
  const maxDistance = term.length > 6 ? 2 : 1;
  return Math.abs(candidate.length - term.length) <= maxDistance && getEditDistance(term, candidate) <= maxDistance;
}

function textMatchesTerm(text: string, term: string) {
  const normalizedText = text.toLowerCase();
  if (normalizedText.includes(term)) return true;
  return normalizedText.split(/[^a-z0-9]+/).some((word) => isFuzzyMatch(term, word));
}

function getFuzzyCategory(normalizedQuestion: string) {
  const terms = normalizedQuestion.split(/[^a-z0-9]+/).filter(Boolean);
  const categoryAlias = Object.entries(categoryAliases).find(([alias]) =>
    terms.some((term) => isFuzzyMatch(term, alias)),
  );
  return categoryAlias?.[1];
}

export function parseQuestion(question: string): ParsedQuestion {
  const normalizedQuestion = question.trim().toLowerCase();
  const categoryToken = normalizedQuestion.match(/\b(braids?|hair|nails?|manicure|pedicure|barber(?:ing|s)?|makeup|facials?|skincare|tattoos?)\b/);
  const priceMatch = normalizedQuestion.match(/(?:under|below|less than)\s*r?\s*(\d+(?:\.\d+)?)/);
  const locationMatch = normalizedQuestion.match(/\bnear\s+(?!me\b)([a-z][a-z\s-]*?)(?=\s+(?:under|below|less than)\b|$)/);
  const weekdayMatch = normalizedQuestion.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  const category = categoryToken ? categoryAliases[categoryToken[1]] : getFuzzyCategory(normalizedQuestion);
  const wantsNearby = /\b(near me|nearby|close to me|around me)\b/.test(normalizedQuestion);
  const searchTerms = normalizedQuestion
    .replace(categoryToken?.[0] || "", "")
    .replace(priceMatch?.[0] || "", "")
    .replace(locationMatch?.[0] || "", "")
    .replace(weekdayMatch?.[0] || "", "")
    .replace(/\b(today|tomorrow|weekend)\b/g, "")
    .replace(/\b(near me|nearby|close to me|around me)\b/g, "")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term && !searchStopWords.has(term));

  return {
    category,
    location: locationMatch?.[1].trim(),
    maxPrice: priceMatch ? Number(priceMatch[1]) : undefined,
    searchTerms,
    wantsNearby,
    preferredWeekday: weekdayMatch ? weekdayAliases[weekdayMatch[1]] : undefined,
    preferredDateLabel: weekdayMatch?.[1],
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function priceFromPost(post: Post) {
  const price = Number(post.price);
  return Number.isFinite(price) ? price : undefined;
}

export function formatPrice(price?: number) {
  if (price == null) return "";
  return `R${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
}

export function formatPriceRange(artist: ArtistMatch) {
  if (artist.minPrice == null) return "";
  if (artist.maxPrice != null && artist.maxPrice !== artist.minPrice) {
    return `${formatPrice(artist.minPrice)}-${formatPrice(artist.maxPrice)}`;
  }
  return formatPrice(artist.minPrice);
}

export function formatDistanceKm(distanceKm?: number) {
  if (distanceKm == null) return "";
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`;
}

export function formatSlot(slot: AvailabilitySlot) {
  return new Date(slot.startsAt).toLocaleString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDurationMinutes(minutes?: number): string {
  if (!minutes) return "60 mins";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours && remaining) return `${hours}h ${remaining}m`;
  if (hours) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${remaining} mins`;
}

// ─── Booking Helpers ──────────────────────────────────────────────────────────

export function createBookingNote(artist: ArtistMatch) {
  const serviceText = artist.service || artist.category || "a beauty service";
  return `Hi ${artist.name}, I found you on Glam SA and would like to request a booking for ${serviceText}.`;
}

export function selectBestService(services: ServiceOffering[], artist: ArtistMatch) {
  const activeServices = services.filter((service) => service.isActive);
  const normalizedService = artist.service?.toLowerCase();
  const normalizedCategory = artist.category?.toLowerCase();
  const match = activeServices.find((service) => {
    const normalizedName = service.name.toLowerCase();
    return (
      Boolean(normalizedService && (normalizedName.includes(normalizedService) || normalizedService.includes(normalizedName))) ||
      Boolean(normalizedCategory && normalizedName.includes(normalizedCategory))
    );
  });
  return match || activeServices[0];
}

export function sortSlotsByPreference(slots: AvailabilitySlot[], preferredWeekday?: number) {
  if (preferredWeekday == null) return slots;
  return [...slots].sort((leftSlot, rightSlot) => {
    const leftMatches = new Date(leftSlot.startsAt).getDay() === preferredWeekday;
    const rightMatches = new Date(rightSlot.startsAt).getDay() === preferredWeekday;
    if (leftMatches === rightMatches) return leftSlot.startsAt.localeCompare(rightSlot.startsAt);
    return leftMatches ? -1 : 1;
  });
}

export function withBookingPreference(artists: ArtistMatch[], parsedQuestion: ParsedQuestion) {
  return artists.map((artist) => ({
    ...artist,
    preferredWeekday: parsedQuestion.preferredWeekday,
    preferredDateLabel: parsedQuestion.preferredDateLabel,
  }));
}

// ─── Artist Matching ──────────────────────────────────────────────────────────

export function getArtistMatches(posts: Post[]): ArtistMatch[] {
  const artistsByKey = new Map<string, ArtistMatch>();

  posts.forEach((post) => {
    const key = post.ownerId ? `owner-${post.ownerId}` : `handle-${post.handle.toLowerCase()}`;
    const existingArtist = artistsByKey.get(key);
    const price = priceFromPost(post);

    if (existingArtist) {
      artistsByKey.set(key, {
        ...existingArtist,
        postId: existingArtist.postId || post.id,
        whatsappNumber: existingArtist.whatsappNumber || post.whatsappNumber,
        minPrice: price == null ? existingArtist.minPrice : Math.min(existingArtist.minPrice ?? price, price),
        maxPrice: price == null ? existingArtist.maxPrice : Math.max(existingArtist.maxPrice ?? price, price),
        resultCount: existingArtist.resultCount + 1,
      });
      return;
    }

    artistsByKey.set(key, {
      id: key,
      ownerId: post.ownerId,
      postId: post.id,
      name: post.creator,
      handle: post.handle,
      service: post.service,
      category: post.category,
      location: post.location,
      whatsappNumber: post.whatsappNumber,
      minPrice: price,
      maxPrice: price,
      resultCount: 1,
    });
  });

  return Array.from(artistsByKey.values());
}

export function matchesQuestion(post: Post, parsedQuestion: ParsedQuestion) {
  const matchesCategory = !parsedQuestion.category || post.category.toLowerCase() === parsedQuestion.category.toLowerCase();
  const matchesLocation = !parsedQuestion.location || textMatchesTerm(post.location, parsedQuestion.location);
  const matchesPrice = parsedQuestion.maxPrice == null || Number(post.price) <= parsedQuestion.maxPrice;
  const searchableText = [post.creator, post.handle, post.location, post.service, post.category, post.caption]
    .join(" ")
    .toLowerCase();
  const matchesSearch = parsedQuestion.searchTerms.every((term) => textMatchesTerm(searchableText, term));
  return matchesCategory && matchesLocation && matchesPrice && matchesSearch;
}

export function mergeNearbyArtist(artist: NearbyArtist, postMatch?: ArtistMatch): ArtistMatch {
  return {
    id: `owner-${artist.id}`,
    ownerId: artist.id,
    name: artist.name,
    handle: artist.handle,
    service: postMatch?.service,
    postId: postMatch?.postId,
    category: postMatch?.category,
    location: artist.locationLabel || postMatch?.location,
    whatsappNumber: artist.whatsappNumber || postMatch?.whatsappNumber,
    distanceKm: artist.distanceKm,
    minPrice: postMatch?.minPrice,
    maxPrice: postMatch?.maxPrice,
    resultCount: postMatch?.resultCount || artist.postCount,
  };
}

export async function answerQuestion(
  question: string,
  posts: Post[],
  currentUser: CurrentUser | null,
): Promise<Pick<ChatMessage, "text" | "matches" | "quickReplies" | "fullResultCount" | "fullResultQuery">> {
  const parsedQuestion = parseQuestion(question);
  const matchingPosts = posts.filter((post) => matchesQuestion(post, parsedQuestion));

  if (parsedQuestion.wantsNearby) {
    if (currentUser?.latitude == null || currentUser.longitude == null) {
      return {
        text: "I need your profile location before I can show artists near you.",
        quickReplies: ["Makeup in Sandton", "Nails under R500", "Browse the full feed"],
      };
    }

    try {
      const nearbyArtists = await getNearbyArtists({
        latitude: currentUser.latitude,
        longitude: currentUser.longitude,
        radius: 50,
      });
      const postMatchesByOwnerId = new Map(
        getArtistMatches(matchingPosts).flatMap((artist) => (artist.ownerId ? [[artist.ownerId, artist]] : [])),
      );
      const nearbyMatches = nearbyArtists
        .map((artist) => mergeNearbyArtist(artist, postMatchesByOwnerId.get(artist.id)))
        .filter((artist) => {
          const matchesCat = !parsedQuestion.category || artist.category === parsedQuestion.category || postMatchesByOwnerId.has(artist.ownerId || 0);
          const matchesPrice = parsedQuestion.maxPrice == null || artist.minPrice == null || artist.minPrice <= parsedQuestion.maxPrice;
          const searchableText = [artist.name, artist.handle, artist.service, artist.category, artist.location].join(" ").toLowerCase();
          return matchesCat && matchesPrice && parsedQuestion.searchTerms.every((term) => textMatchesTerm(searchableText, term));
        });

      if (nearbyMatches.length > 0) {
        return {
          text: `Here are ${Math.min(nearbyMatches.length, 3)} nearby artist${nearbyMatches.length === 1 ? "" : "s"} within 50 km.`,
          matches: withBookingPreference(nearbyMatches.slice(0, 3), parsedQuestion),
          fullResultCount: nearbyMatches.length > 3 ? nearbyMatches.length : undefined,
          fullResultQuery: question,
        };
      }
    } catch {
      return { text: "I could not load nearby artists right now. Try a location search instead.", quickReplies: fallbackSuggestions };
    }
  }

  if (matchingPosts.length === 0) {
    return {
      text: "I could not find a matching artist yet. Try a broader location, category, or budget.",
      quickReplies: fallbackSuggestions,
    };
  }

  const allArtistMatches = getArtistMatches(matchingPosts);
  const matches = withBookingPreference(allArtistMatches.slice(0, 3), parsedQuestion);
  const suffix = matchingPosts.length > matches.length ? ` I found ${matchingPosts.length} matching looks in total.` : "";
  return {
    text: `Here are ${matches.length} matching artist${matches.length === 1 ? "" : "s"}.${suffix}`,
    matches,
    fullResultCount: allArtistMatches.length > 3 ? allArtistMatches.length : undefined,
    fullResultQuery: question,
  };
}
