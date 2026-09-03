import { useEffect, useState } from "react";
import { getCategories, getCurrentUser, getPosts, logout } from "./api";
import "./App.css";
import MobileNav from "./components/MobileNav";
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
import type { CurrentUser, Post } from "./types";

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
  // Search is intentionally applied after the nearby/category filters are loaded.
  const visiblePosts = posts.filter((post) => {
    const matchesCategory = activeCategory === "For you" || post.service.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      normalizedQuery.length === 0 ||
      [post.creator, post.handle, post.location, post.service, post.caption].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );

    return matchesCategory && matchesSearch;
  });

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
      return <ProfilePage profileId={Number.isInteger(profileId) && profileId > 0 ? profileId : undefined} currentUser={currentUser} onNavigate={navigate} onLogout={() => void handleLogout()} />;
    }

    if (pathname === "/messages") {
      return <MessagesPage currentUser={currentUser} onNavigate={navigate} />;
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
    </div>
  );
}

export default App;
