// Main feed page combining stories, filters, and community posts.
import CategoryTabs from "../components/CategoryTabs";
import PostCard from "../components/PostCard";
import { IconCompass, IconPin, IconUpload } from "../components/Icons";
import type { CurrentUser, Post } from "../types";

type HomePageProps = {
  activeCategory: string;
  categories: string[];
  currentDate: string;
  emptyCopy: string;
  error: string;
  hasLocation: boolean;
  isLoading: boolean;
  nearbyOnly: boolean;
  posts: Post[];
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  onSelectCategory: (category: string) => void;
  onToggleNearby: () => void;
};

function HomePage({
  activeCategory,
  categories,
  currentDate,
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
}: HomePageProps) {
  return (
    <div className="page-content home-page">
      {/* Editorial Hero */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-badge">
            <span>{currentDate} · SOUTH AFRICAN BEAUTY DIRECTORY</span>
          </div>
          <h1 className="hero-title">
            Where artistry meets <em>signature style</em>
          </h1>
          <p className="hero-subtitle">
            Discover hair stylists, makeup artists, nail technicians, and barbers across South Africa.
          </p>

          <div className="hero-button-row">
            <button
              className="btn-primary"
              type="button"
              onClick={() => onNavigate("/upload")}
            >
              <IconUpload size={18} />
              <span>Share Your Work</span>
            </button>

            <button
              className="btn-ghost"
              type="button"
              onClick={() => onNavigate("/discover")}
            >
              <IconCompass size={18} />
              <span>Find Artists on Map</span>
            </button>
          </div>
        </div>
      </section>

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
            {nearbyOnly
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
