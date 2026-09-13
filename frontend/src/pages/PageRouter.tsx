import React from "react";
import type { CurrentUser, Post } from "../types";
import DiscoverPage from "./DiscoverPage";
import HomePage from "./HomePage";
import LoginPage from "./LoginPage";
import UploadPage from "./UploadPage";
import ProfilePage from "./ProfilePage";
import MessagesPage from "./MessagesPage";
import SettingsPage from "./SettingsPage";
import InfoPage from "./InfoPage";
import NotificationsPage from "./NotificationsPage";
import AdminPage from "./AdminPage";
import SavedPage from "./SavedPage";
import ClientDashboardPage from "./ClientDashboardPage";

type PageRouterProps = {
  pathname: string;
  currentUser: CurrentUser | null;
  activeCategory: string;
  nearbyOnly: boolean;
  isLoading: boolean;
  posts: Post[];
  query: string;
  searchSummary: string;
  categories: string[];
  emptyCopy: string;
  hasLocation: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSelectCategory: (category: string) => void;
  onToggleNearby: () => void;
  onQueryChange: (query: string) => void;
};

/**
 * Routes pathname to appropriate page component
 */
export function renderPage({
  pathname,
  currentUser,
  activeCategory,
  nearbyOnly,
  isLoading,
  posts,
  query,
  searchSummary,
  categories,
  emptyCopy,
  hasLocation,
  onNavigate,
  onLogout,
  onRefresh,
  onSelectCategory,
  onToggleNearby,
  onQueryChange,
}: PageRouterProps): React.ReactNode {
  // /upload
  if (pathname === "/upload") {
    return (
      <UploadPage
        categories={categories}
        currentUser={currentUser}
        onNavigate={onNavigate}
      />
    );
  }

  // /settings
  if (pathname === "/settings") {
    return (
      <SettingsPage
        currentUser={currentUser}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    );
  }

  // /login
  if (pathname === "/login") {
    return <LoginPage onNavigate={onNavigate} />;
  }

  // /profile or /profile/:id
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    const profileId = Number(pathname.split("/")[2]);
    return (
      <ProfilePage
        profileId={
          Number.isInteger(profileId) && profileId > 0 ? profileId : undefined
        }
        currentUser={currentUser}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    );
  }

  // /messages
  if (pathname === "/messages") {
    return (
      <MessagesPage currentUser={currentUser} onNavigate={onNavigate} />
    );
  }

  // /discover
  if (pathname === "/discover") {
    return (
      <DiscoverPage currentUser={currentUser} onNavigate={onNavigate} />
    );
  }

  // /admin
  if (pathname === "/admin") {
    return (
      <AdminPage currentUser={currentUser} onNavigate={onNavigate} />
    );
  }

  // /info
  if (pathname === "/info") {
    return <InfoPage onNavigate={onNavigate} />;
  }

  // /notifications
  if (pathname === "/notifications") {
    return (
      <NotificationsPage currentUser={currentUser} onNavigate={onNavigate} />
    );
  }

  // /saved
  if (pathname === "/saved") {
    return (
      <SavedPage currentUser={currentUser} onNavigate={onNavigate} />
    );
  }

  // /dashboard (client-only)
  if (pathname === "/dashboard") {
    return (
      <ClientDashboardPage
        currentUser={currentUser}
        onNavigate={onNavigate}
      />
    );
  }

  // Default to home (/)
  return (
    <HomePage
      activeCategory={activeCategory}
      categories={categories}
      emptyCopy={emptyCopy}
      error={""}
      hasLocation={hasLocation}
      isLoading={isLoading}
      nearbyOnly={nearbyOnly}
      posts={posts}
      query={query}
      searchSummary={searchSummary}
      currentUser={currentUser}
      onNavigate={onNavigate}
      onSelectCategory={onSelectCategory}
      onToggleNearby={onToggleNearby}
      onRefresh={onRefresh}
    />
  );
}
