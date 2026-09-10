// Home feed — hero tagline, category pills, and 2-column editorial post grid.
import CategoryTabs from "../components/CategoryTabs";
import PostCard from "../components/PostCard";
import { IconPin } from "../components/Icons";
import type { CurrentUser, Post } from "../types";

type HomePageProps = {
  activeCategory: string;
  categories: string[];
  emptyCopy: string;
  error: string;
  hasLocation: boolean;
  isLoading: boolean;
  nearbyOnly: boolean;
  posts: Post[];
  searchSummary: string;
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  onSelectCategory: (category: string) => void;
  onToggleNearby: () => void;
};

function HomePage({
  activeCategory,
  categories,
  emptyCopy,
  error,
  hasLocation,
  isLoading,
  nearbyOnly,
  posts,
  onNavigate,
  onSelectCategory,
  onToggleNearby,
  currentUser,
  searchSummary,
}: HomePageProps) {
  return (
    <div className="page-content home-page">

      {/* Category pill strip */}
      <section className="home-cat-section">
        <CategoryTabs
          activeCategory={activeCategory}
          categories={categories}
          isLoading={isLoading}
          onSelectCategory={onSelectCategory}
        />
      </section>

      {/* Feed header */}
      <section className="home-feed-header">
        <div className="home-feed-title">
          <h2>
            {nearbyOnly
              ? "Talent Around You"
              : activeCategory === "For you"
              ? "All Styles"
              : activeCategory}
          </h2>
          <p className="home-feed-subtitle">
            {searchSummary
              ? `Smart search: ${searchSummary}`
              : nearbyOnly
              ? "Creators within 50 km of you"
              : "Latest looks from South African beauty artists"}
          </p>
        </div>

        <div className="home-feed-controls">
          {hasLocation && (
            <button
              className={`home-nearby-btn${nearbyOnly ? " active" : ""}`}
              type="button"
              onClick={onToggleNearby}
            >
              <IconPin size={13} />
              <span>{nearbyOnly ? "Within 50 km" : "Near me"}</span>
            </button>
          )}
          <span className="home-post-count">
            {posts.length} {posts.length === 1 ? "look" : "looks"}
          </span>
        </div>
      </section>

      {/* Feed grid */}
      <div className="home-feed-grid">
        {isLoading && (
          <div className="home-skeleton-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="home-post-skeleton">
                <div className="skeleton home-skeleton-media" />
                <div className="skeleton home-skeleton-line" style={{ width: "70%" }} />
                <div className="skeleton home-skeleton-line" style={{ width: "50%" }} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="empty-state error">
            <p>{error}</p>
            <button className="btn-outline-sm" type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && posts.length === 0 && (
          <div className="empty-state">
            <h3>No posts found</h3>
            <p>{emptyCopy}</p>
            <button className="btn-primary" type="button" onClick={() => onNavigate("/upload")}>
              Post the First Look
            </button>
          </div>
        )}

        {!isLoading && !error && posts.length > 0 && (
          <div className="post-masonry-feed">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} currentUser={currentUser} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
