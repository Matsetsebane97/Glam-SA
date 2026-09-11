import type { ArtistSummary, Post } from "../types";

const priceFormatter = new Intl.NumberFormat("en-ZA", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "ZAR",
});

function formatPrice(value: number) {
  return priceFormatter.format(value).replace("ZAR", "R").replace(/\s/g, "");
}

export function buildArtistSummaries(posts: Post[]): ArtistSummary[] {
  const grouped = new Map<string, Post[]>();

  posts.forEach((post) => {
    const key = post.ownerId ? `owner-${post.ownerId}` : post.handle || post.creator;
    grouped.set(key, [...(grouped.get(key) || []), post]);
  });

  return [...grouped.entries()]
    .map(([id, artistPosts]) => {
      const firstPost = artistPosts[0];
      const prices = artistPosts.map((post) => Number(post.price)).filter((price) => Number.isFinite(price) && price > 0);
      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;
      const priceRange = prices.length === 0
        ? "Ask for pricing"
        : minPrice === maxPrice
          ? `From ${formatPrice(minPrice)}`
          : `${formatPrice(minPrice)}-${formatPrice(maxPrice)}`;
      const categories = [...new Set(artistPosts.map((post) => post.category).filter(Boolean))].slice(0, 3);
      const likes = artistPosts.reduce((total, post) => total + (post.likesCount || 0), 0);

      return {
        id,
        ownerId: firstPost.ownerId,
        name: firstPost.creator,
        handle: firstPost.handle,
        location: firstPost.creatorLocation || firstPost.location,
        distanceKm: firstPost.distanceKm,
        priceRange,
        categories,
        postCount: artistPosts.length,
        availableLabel: firstPost.ownerId ? "Book on Glam SA" : firstPost.whatsappNumber ? "WhatsApp available" : "Message to check",
        imageUrl: firstPost.mediaUrl || firstPost.imageUrl,
        whatsappNumber: firstPost.whatsappNumber,
        _score: (firstPost.distanceKm == null ? 0 : 100 - firstPost.distanceKm) + likes + artistPosts.length * 3,
      };
    })
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...summary }) => summary);
}

export function formatArtistDistance(distanceKm?: number) {
  if (distanceKm == null) return "Distance varies";
  if (distanceKm < 1) return "Under 1 km";
  return `${distanceKm.toFixed(1)} km away`;
}
