import type { Post } from "../types";

export const SAVED_POSTS_EVENT = "glam:saved-posts-changed";

const savedPostsKey = (userId: number) => `glamSavedPosts:${userId}`;

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
