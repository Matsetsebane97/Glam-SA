import { useEffect, useState } from "react";
import PostCard from "../components/PostCard";
import { IconBookmark } from "../components/Icons";
import type { CurrentUser, Post } from "../types";
import { getSavedPostIds, SAVED_POSTS_EVENT } from "../utils/savedPosts";

type SavedPageProps = {
  currentUser: CurrentUser | null;
  posts: Post[];
  onNavigate: (path: string) => void;
};

function SavedPage({ currentUser, posts, onNavigate }: SavedPageProps) {
  const [savedIds, setSavedIds] = useState(() => getSavedPostIds(currentUser?.id));

  useEffect(() => {
    const syncSavedPosts = () => setSavedIds(getSavedPostIds(currentUser?.id));
    window.addEventListener(SAVED_POSTS_EVENT, syncSavedPosts);
    return () => window.removeEventListener(SAVED_POSTS_EVENT, syncSavedPosts);
  }, [currentUser?.id]);

  if (!currentUser) {
    return (
      <section className="saved-page-empty">
        <IconBookmark size={30} />
        <h2>Sign in to see your saved looks</h2>
        <p>Keep your favourite beauty ideas in one place for your next appointment.</p>
        <button className="btn-primary" type="button" onClick={() => onNavigate("/login")}>Sign in</button>
      </section>
    );
  }

  const savedPosts = savedIds
    .map((id) => posts.find((post) => post.id === id))
    .filter((post): post is Post => Boolean(post));

  return (
    <section className="saved-page">
      <header className="saved-page-header">
        <div>
          <span className="saved-page-eyebrow">Your collection</span>
          <h1>Saved looks</h1>
          <p>Ideas you bookmarked for later.</p>
        </div>
        <span className="saved-page-count">{savedPosts.length} {savedPosts.length === 1 ? "look" : "looks"}</span>
      </header>

      {savedPosts.length === 0 ? (
        <div className="saved-page-empty">
          <IconBookmark size={30} />
          <h2>Your saved looks will appear here</h2>
          <p>Tap the bookmark icon on any community look to keep it close.</p>
          <button className="btn-primary" type="button" onClick={() => onNavigate("/")}>Browse the feed</button>
        </div>
      ) : (
        <div className="post-masonry-feed">
          {savedPosts.map((post) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </section>
  );
}

export default SavedPage;
