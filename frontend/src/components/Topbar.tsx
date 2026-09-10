// Global search and account controls — frosted glass sticky header.
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { getConversations } from "../api";
import { brandLogoUrl } from "../constants";
import { IconBell, IconClose, IconMoon, IconSearch, IconSun } from "./Icons";
import type { Conversation, CurrentUser } from "../types";

type TopbarProps = {
  currentUser: CurrentUser | null;
  query: string;
  onQueryChange: (query: string) => void;
  onNavigate: (path: string) => void;
};

function Topbar({ currentUser, query, onQueryChange, onNavigate }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Conversation[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 60);
    }
  }, [mobileSearchOpen]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    setIsLoadingNotifications(true);
    void getConversations()
      .then((convs) => setNotifications(convs.filter((c) => (c.unreadCount ?? 0) > 0)))
      .catch(() => setNotifications([]))
      .finally(() => setIsLoadingNotifications(false));
  }, [currentUser]);

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    onQueryChange("");
  };

  return (
    <header className="topbar">
      {/* Brand — centred on mobile, leftmost on desktop (sidebar has it) */}
      <div className="topbar-brand" onClick={() => onNavigate("/")} role="button" tabIndex={0} aria-label="Go home">
        <img className="topbar-logo" src={brandLogoUrl} alt="Glam SA" />
        <span className="topbar-brand-name">Glam SA</span>
      </div>

      {/* Desktop search */}
      <div className={`topbar-search-wrap${searchFocused ? " focused" : ""}`}>
        <label className="topbar-search-box">
          <IconSearch size={17} className="topbar-search-icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search hair, braids, makeup, nails, barber…"
            aria-label="Search looks and artists"
            className="topbar-search-input"
          />
          {query && (
            <button
              className="topbar-search-clear"
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
            >
              <IconClose size={13} />
            </button>
          )}
        </label>
      </div>

      {/* Right action cluster */}
      <div className="topbar-actions">
        {/* Mobile search toggle */}
        <button
          className="topbar-icon-btn mobile-only"
          aria-label="Search"
          type="button"
          onClick={() => setMobileSearchOpen(true)}
        >
          <IconSearch size={18} />
        </button>

        {/* Theme toggle */}
        <button
          className="topbar-icon-btn"
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          type="button"
          onClick={toggleTheme}
        >
          {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
        </button>

        {/* Notifications */}
        <div className="topbar-notif-wrap" ref={notifRef}>
          <button
            className="topbar-icon-btn"
            aria-label="Notifications"
            type="button"
            onClick={() => setShowNotifications((v) => !v)}
          >
            <IconBell size={18} />
            {notifications.length > 0 && (
              <span className="topbar-notif-dot" aria-hidden="true" />
            )}
          </button>

          {showNotifications && (
            <div className="topbar-notif-dropdown" role="dialog" aria-label="Notifications">
              <div className="topbar-notif-header">
                <strong>Notifications</strong>
                {notifications.length > 0 && (
                  <span className="topbar-notif-count">
                    {notifications.reduce((s, n) => s + (n.unreadCount ?? 0), 0)} unread
                  </span>
                )}
              </div>

              {!currentUser && (
                <div className="topbar-notif-empty">
                  <p>Sign in to see notifications.</p>
                </div>
              )}
              {currentUser && isLoadingNotifications && (
                <div className="topbar-notif-empty">
                  <p>Loading…</p>
                </div>
              )}
              {currentUser && !isLoadingNotifications && notifications.length === 0 && (
                <div className="topbar-notif-empty">
                  <p>No unread notifications.</p>
                </div>
              )}
              {currentUser && !isLoadingNotifications && notifications.length > 0 && (
                <div className="topbar-notif-list">
                  {notifications.slice(0, 5).map((n) => (
                    <button
                      key={n.userId}
                      className="topbar-notif-item"
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigate("/messages");
                      }}
                    >
                      <span className="topbar-notif-avatar">{n.name.charAt(0).toUpperCase()}</span>
                      <span className="topbar-notif-copy">
                        <strong>{n.name}</strong>
                        <span>{n.lastMessage}</span>
                      </span>
                      {(n.unreadCount ?? 0) > 0 && (
                        <span className="topbar-notif-badge">{n.unreadCount}</span>
                      )}
                    </button>
                  ))}
                  <button
                    className="topbar-notif-view-all"
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigate("/messages");
                    }}
                  >
                    View all messages →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auth / avatar */}
        {!currentUser ? (
          <button
            className="topbar-sign-in-btn"
            type="button"
            onClick={() => onNavigate("/login")}
          >
            Sign in
          </button>
        ) : (
          <button
            className="topbar-avatar-btn"
            type="button"
            onClick={() => onNavigate("/profile")}
            title={`${currentUser.name} — My Profile`}
          >
            {currentUser.profilePhotoUrl ? (
              <img src={currentUser.profilePhotoUrl} alt={currentUser.name} />
            ) : (
              currentUser.name.charAt(0).toUpperCase()
            )}
          </button>
        )}
      </div>

      {/* Mobile full-screen search overlay */}
      {mobileSearchOpen && (
        <div className="topbar-mobile-search" role="search" aria-label="Mobile search">
          <label className="topbar-mobile-search-box">
            <IconSearch size={19} />
            <input
              ref={mobileInputRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search hair, braids, makeup…"
              aria-label="Search"
              className="topbar-search-input"
            />
            {query && (
              <button className="topbar-search-clear" type="button" onClick={() => onQueryChange("")} aria-label="Clear">
                <IconClose size={15} />
              </button>
            )}
          </label>
          <button className="topbar-mobile-cancel" type="button" onClick={closeMobileSearch}>
            Cancel
          </button>
          {query && (
            <p className="topbar-mobile-hint">
              Showing results for <strong>"{query}"</strong>
            </p>
          )}
        </div>
      )}
    </header>
  );
}

export default Topbar;
