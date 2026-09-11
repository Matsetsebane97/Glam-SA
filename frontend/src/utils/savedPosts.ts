// Browser-local saved looks. The user ID keeps one account's collection
// separate from another account using the same device.
import type { Post } from "../types";
import type { ArtistSummary } from "../types";

export const SAVED_POSTS_EVENT = "glam:saved-posts-changed";
export const SAVED_ARTISTS_EVENT = "glam:saved-artists-changed";

const savedPostsKey = (userId: number) => `glamSavedPosts:${userId}`;
const savedArtistsKey = (userId: number) => `glamSavedArtists:${userId}`;

export function getSavedPostIds(userId?: number): number[] {
  if (!userId) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(savedPostsKey(userId)) || "[]");
    return Array.isArray(value) ? value.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function isPostSaved(userId: number | undefined, postId: number): boolean {
  return getSavedPostIds(userId).includes(postId);
}

export function toggleSavedPost(userId: number, post: Post): boolean {
  const current = getSavedPostIds(userId);
  const next = current.includes(post.id)
    ? current.filter((id) => id !== post.id)
    : [post.id, ...current];
  window.localStorage.setItem(savedPostsKey(userId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(SAVED_POSTS_EVENT));
  return next.includes(post.id);
}

export function getSavedArtists(userId?: number): ArtistSummary[] {
  if (!userId) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(savedArtistsKey(userId)) || "[]");
    return Array.isArray(value) ? value.filter((artist): artist is ArtistSummary => Boolean(artist?.id && artist?.name)) : [];
  } catch {
    return [];
  }
}

export function isArtistSaved(userId: number | undefined, artistId: string): boolean {
  return getSavedArtists(userId).some((artist) => artist.id === artistId);
}

export function toggleSavedArtist(userId: number, artist: ArtistSummary): boolean {
  const current = getSavedArtists(userId);
  const exists = current.some((item) => item.id === artist.id);
  const next = exists ? current.filter((item) => item.id !== artist.id) : [artist, ...current];
  window.localStorage.setItem(savedArtistsKey(userId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(SAVED_ARTISTS_EVENT));
  return !exists;
}
