import { useEffect, useState } from "react";
import { ToastProvider } from "./context/ToastContext";
import { getCategories, getCurrentUser, getPosts, logout } from "./api";
import { parseSmartQuery, formatSearchSummary } from "./utils/searchQuery";
import { renderPage } from "./pages/PageRouter";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import "./App.css";
import OnboardingWalkthrough, { STORAGE_KEY as ONBOARDING_KEY } from "./components/OnboardingWalkthrough";
import MobileNav from "./components/MobileNav";
import { Toaster } from "./components/Toast";
import { useToast } from "./context/ToastContext";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import RightRail from "./components/RightRail";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { navForPath } from "./constants";
import type { CurrentUser, Post } from "./types";

/**
 * Main App component
 * Coordinates global state: auth, search, navigation, posts
 * Delegates page rendering to PageRouter
 */
function App() {
  const [activeCategory, setActiveCategory] = useState("For you");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pathname, setPathname] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 5000 });
  const [selectedLocation, setSelectedLocation] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Client-side navigation without page reload
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Determine if user has location for nearby filtering
  const hasLocation = currentUser?.latitude != null && currentUser?.longitude != null;

  // Refresh posts from API
  const refreshPosts = async () => {
    const nextPosts = await getPosts(
      nearbyOnly && hasLocation
        ? {
            latitude: currentUser!.latitude!,
            longitude: currentUser!.longitude!,
            radius: 50,
          }
        : undefined,
    );
    setPosts(nextPosts);
  };

  // Auth: re-check session on navigation
  useEffect(() => {
    void getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        if (user && !localStorage.getItem(ONBOARDING_KEY)) {
          setShowOnboarding(true);
        }
      })
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  // Router: listen for back button
  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Data: load categories and posts on mount and filter changes
  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [nextCategories, nextPosts] = await Promise.all([
          getCategories(),
          getPosts(
            nearbyOnly && hasLocation
              ? {
                  latitude: currentUser!.latitude!,
                  longitude: currentUser!.longitude!,
                  radius: 50,
                }
              : undefined,
          ),
        ]);
        setCategories(nextCategories);
        setPosts(nextPosts);
      } catch {
        setError("We could not connect to the community right now.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadContent();
  }, [nearbyOnly, hasLocation, currentUser]);

  // Search: parse query and filter posts
  const smartQuery = parseSmartQuery(query);
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePosts = posts.filter((post) => {
    const selectedCategory = smartQuery.category || (activeCategory === "For you" ? undefined : activeCategory);
    const matchesCategory = !selectedCategory || post.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesLocation = !smartQuery.location || post.location.toLowerCase().includes(smartQuery.location);
    const matchesPrice = smartQuery.maxPrice == null || Number(post.price) <= smartQuery.maxPrice;
    const searchableText = [post.creator, post.handle, post.location, post.service, post.category, post.caption]
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      normalizedQuery.length === 0 || smartQuery.searchTerms.every((term) => searchableText.includes(term));

    return matchesCategory && matchesLocation && matchesPrice && matchesSearch;
  });

  const searchSummary = query.trim() ? formatSearchSummary(smartQuery) : "";

  const emptyCopy = query
    ? "No community posts match your search yet."
    : nearbyOnly
      ? "No posts from artists near you yet. Try turning off the nearby filter."
      : activeCategory === "For you"
        ? "No community posts yet. Be the first to share your work."
        : `No ${activeCategory.toLowerCase()} posts yet. Be the first to share one.`;

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    navigate("/");
  };

  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  return (
    <ToastProvider>
      <AppContent
          showOnboarding={showOnboarding}
          setShowOnboarding={setShowOnboarding}
          currentUser={currentUser}
          pathname={pathname}
          query={query}
          setQuery={setQuery}
          searchSummary={searchSummary}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          nearbyOnly={nearbyOnly}
          setNearbyOnly={setNearbyOnly}
          isLoading={isLoading}
          error={error}
          posts={visiblePosts}
          categories={categories}
          emptyCopy={emptyCopy}
          hasLocation={hasLocation}
          navigate={navigate}
          handleLogout={handleLogout}
          refreshPosts={refreshPosts}
          showKeyboardShortcuts={showKeyboardShortcuts}
          setShowKeyboardShortcuts={setShowKeyboardShortcuts}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          filterPanelOpen={filterPanelOpen}
          setFilterPanelOpen={setFilterPanelOpen}
        />
      </ToastProvider>
  );
}

type AppContentProps = {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  currentUser: CurrentUser | null;
  pathname: string;
  query: string;
  setQuery: (query: string) => void;
  searchSummary: string;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  nearbyOnly: boolean;
  setNearbyOnly: (nearbyOnly: boolean) => void;
  isLoading: boolean;
  error: string;
  posts: Post[];
  categories: string[];
  emptyCopy: string;
  hasLocation: boolean;
  navigate: (path: string) => void;
  handleLogout: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  showKeyboardShortcuts: boolean;
  setShowKeyboardShortcuts: (show: boolean) => void;
  priceRange: { min: number; max: number };
  setPriceRange: (range: { min: number; max: number }) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  filterPanelOpen: boolean;
  setFilterPanelOpen: (open: boolean) => void;
};

/**
 * AppContent: renders the layout and delegates page rendering
 * Separated so it can use useToast hook inside ToastProvider
 */
function AppContent(props: AppContentProps) {
  const { toasts, removeToast } = useToast();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    focusSearch: () => {
      const searchInput = document.querySelector(
        'input[placeholder*="Search"]'
      ) as HTMLInputElement;
      searchInput?.focus();
    },
    showHelp: () => {
      props.setShowKeyboardShortcuts(true);
    },
  });

  const pageContent = renderPage({
    pathname: props.pathname,
    currentUser: props.currentUser,
    activeCategory: props.activeCategory,
    nearbyOnly: props.nearbyOnly,
    isLoading: props.isLoading,
    posts: props.posts,
    query: props.query,
    searchSummary: props.searchSummary,
    categories: props.categories,
    emptyCopy: props.emptyCopy,
    hasLocation: props.hasLocation,
    onNavigate: props.navigate,
    onLogout: props.handleLogout,
    onRefresh: props.refreshPosts,
    onSelectCategory: props.setActiveCategory,
    onToggleNearby: () => props.setNearbyOnly(!props.nearbyOnly),
    priceRange: props.priceRange,
    onPriceRangeChange: (min, max) => props.setPriceRange({ min, max }),
    selectedLocation: props.selectedLocation,
    onLocationChange: props.setSelectedLocation,
    filterPanelOpen: props.filterPanelOpen,
    onFilterPanelToggle: props.setFilterPanelOpen,
  });

  return (
    <div className="app-shell">
      {props.showOnboarding && props.currentUser && (
        <OnboardingWalkthrough
          currentUser={props.currentUser}
          onNavigate={props.navigate}
          onDismiss={() => props.setShowOnboarding(false)}
        />
      )}
      <a href="#feed-main" className="skip-to-content">
        Skip to main content
      </a>
      <Sidebar
        activeNav={navForPath(props.pathname)}
        currentUser={props.currentUser}
        onNavigate={props.navigate}
        onLogout={() => void props.handleLogout()}
      />
      <main className="feed-main" id="feed-main">
        <Topbar
          currentUser={props.currentUser}
          query={props.query}
          searchSummary={props.searchSummary}
          onQueryChange={props.setQuery}
          onNavigate={props.navigate}
        />
        {pageContent}
      </main>
      <RightRail currentUser={props.currentUser} onNavigate={props.navigate} />
      <MobileNav pathname={props.pathname} currentUser={props.currentUser} onNavigate={props.navigate} />
      <Toaster toasts={toasts} onClose={removeToast} />
      <KeyboardShortcutsModal
        isOpen={props.showKeyboardShortcuts}
        onClose={() => props.setShowKeyboardShortcuts(false)}
      />
    </div>
  );
}

export default App;
