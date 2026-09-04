import { useEffect, useState } from "react";
import { getCategories, getCurrentUser, getPosts, logout } from "./api";
import "./App.css";
import MobileNav from "./components/MobileNav";
import AssistantPanel from "./components/AssistantPanel";
import RightRail from "./components/RightRail";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { navForPath } from "./constants";
import DiscoverPage from "./pages/DiscoverPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/UploadPage";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import SettingsPage from "./pages/SettingsPage";
import InfoPage from "./pages/InfoPage";
import type { CurrentUser, Post } from "./types";

const categoryAliases: Record<string, string> = {
  braid: "Hair",
  braids: "Hair",
  hair: "Hair",
  nails: "Nails",
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
};

const searchStopWords = new Set(["a", "an", "and", "for", "in", "near", "the", "under", "below", "less", "than"]);

function parseSmartQuery(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const categoryToken = normalizedQuery.match(/\b(braids?|hair|nails?|manicure|pedicure|barber(?:ing|s)?|makeup|skincare|facials?|tattoos?)\b/);
  const priceMatch = normalizedQuery.match(/(?:under|below|less than)\s*r?\s*(\d+(?:\.\d+)?)/);
  const nearMatch = normalizedQuery.match(/\bnear\s+([a-z][a-z\s-]*?)(?=\s+(?:under|below|less than)\b|$)/);
  const category = categoryToken ? categoryAliases[categoryToken[1]] : undefined;
  const location = nearMatch?.[1].trim();
  const searchTerms = normalizedQuery
    .replace(categoryToken?.[0] || "", "")
    .replace(priceMatch?.[0] || "", "")
    .replace(nearMatch?.[0] || "", "")
    .split(/\s+/)
    .filter((term) => term && !searchStopWords.has(term));

  return { category, location, maxPrice: priceMatch ? Number(priceMatch[1]) : undefined, searchTerms };
}

function App() {
  const currentDate = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const [activeCategory, setActiveCategory] = useState("For you");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pathname, setPathname] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Keep navigation client-side so page changes do not reload feed state.
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasLocation =
    currentUser?.latitude != null && currentUser?.longitude != null;

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

  // Re-check the session after navigation so protected pages reflect logout/login changes.
  useEffect(() => {
    void getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Categories and posts share the same loading cycle so the feed renders consistently.
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

  const normalizedQuery = query.trim().toLowerCase();
  const smartQuery = parseSmartQuery(query);
  // Search is intentionally applied after the nearby/category filters are loaded.
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

  const searchSummary = query.trim()
    ? [
        smartQuery.category,
        smartQuery.location && `near ${smartQuery.location}`,
        smartQuery.maxPrice != null && `under R${smartQuery.maxPrice}`,
      ].filter(Boolean).join(" · ") || "Matching looks and artists"
    : "";

  const emptyCopy = query
    ? "No community posts match your search yet."
    : nearbyOnly
      ? "No posts from artists near you yet. Try turning off the nearby filter."
      : activeCategory === "For you"
        ? "No community posts yet. Be the first to share your work."
        : `No ${activeCategory.toLowerCase()} posts yet. Be the first to share one.`;

  const handleUploaded = () => {
    void refreshPosts().catch(() => setError("We could not refresh the feed."));
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    navigate("/");
  };

  const handleProfileUpdated = (updatedUser: CurrentUser) => {
    setCurrentUser(updatedUser);
    navigate("/profile");
  };

  if (pathname === "/login") {
    return <LoginPage onNavigate={navigate} />;
  }

  const renderPage = () => {
    // The lightweight pathname router keeps deep links working without a routing dependency.
    if (pathname === "/upload") {
      return (
        <UploadPage
          categories={categories}
          currentUser={currentUser}
          onNavigate={navigate}
          onUploaded={() => {
            handleUploaded();
            navigate("/");
          }}
        />
      );
    }

    if (pathname === "/discover") {
      return <DiscoverPage currentUser={currentUser} onNavigate={navigate} />;
    }

    if (pathname === "/profile" || pathname.startsWith("/profile/")) {
      const profileId = Number(pathname.split("/")[2]);
      return (
        <ProfilePage
          profileId={Number.isInteger(profileId) && profileId > 0 ? profileId : undefined}
          currentUser={currentUser}
          onNavigate={navigate}
          onLogout={() => void handleLogout()}
        />
      );
    }

    if (pathname === "/messages") {
      return <MessagesPage currentUser={currentUser} onNavigate={navigate} />;
    }

    if (pathname === "/settings") {
      return <SettingsPage currentUser={currentUser} onNavigate={navigate} onSaved={handleProfileUpdated} />;
    }

    if (pathname === "/about" || pathname === "/terms" || pathname === "/privacy") {
      return <InfoPage page={pathname.slice(1) as "about" | "terms" | "privacy"} onNavigate={navigate} />;
    }

    return (
      <HomePage
        activeCategory={activeCategory}
        categories={categories}
        currentDate={currentDate}
        emptyCopy={emptyCopy}
        error={error}
        hasLocation={hasLocation}
        isLoading={isLoading}
        nearbyOnly={nearbyOnly}
        posts={visiblePosts}
        currentUser={currentUser}
        searchSummary={searchSummary}
        onNavigate={navigate}
        onSelectCategory={setActiveCategory}
        onToggleNearby={() => setNearbyOnly((value) => !value)}
      />
    );
  };

  return (
    <div className="app-shell">
      <Sidebar activeNav={navForPath(pathname)} currentUser={currentUser} onNavigate={navigate} onLogout={() => void handleLogout()} />
      <main className="feed-main">
        <Topbar currentUser={currentUser} query={query} onQueryChange={setQuery} onNavigate={navigate} />
        {renderPage()}
      </main>
      <RightRail currentUser={currentUser} onNavigate={navigate} />
      <MobileNav pathname={pathname} currentUser={currentUser} onNavigate={navigate} />
      <AssistantPanel posts={posts} onNavigate={navigate} />
    </div>
  );
}

export default App;
