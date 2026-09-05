// Main feed page combining stories, filters, and community posts.
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
      {/* Editorial Hero */}
      {/* Hero banner removed – streamlined home page */}

      {/* Category Pills Slider */}
      <section className="category-section">
        <CategoryTabs
          activeCategory={activeCategory}
          categories={categories}
          isLoading={isLoading}
          onSelectCategory={onSelectCategory}
        />
      </section>

      {/* Feed Controls Header */}
      <section className="feed-header-bar">
        <div className="feed-title-block">
          <h2>
            {nearbyOnly ? "Talent Around You" : activeCategory === "For you" ? "All Styles" : activeCategory}
          </h2>
          <p>
            {searchSummary
              ? `Smart search: ${searchSummary}`
              : nearbyOnly
              ? "Showing creators within 50 km of your location"
              : "Latest looks shared by South African beauty artists"}
          </p>
        </div>

        <div className="feed-controls">
          {hasLocation && (
            <button
              className={`feed-filter-btn ${nearbyOnly ? "active" : ""}`}
              type="button"
              onClick={onToggleNearby}
            >
              <IconPin size={14} />
              <span>{nearbyOnly ? "Within 50km" : "Near me"}</span>
            </button>
          )}

          <div className="feed-post-count">
            <span>{posts.length} {posts.length === 1 ? "look" : "looks"}</span>
          </div>
        </div>
      </section>

      {/* Posts Grid Feed */}
      <div className="posts-container">
        {isLoading && (
          <div className="empty-state">
            <p>Loading community posts...</p>
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
            <button
              className="btn-primary"
              type="button"
              onClick={() => onNavigate("/upload")}
            >
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
