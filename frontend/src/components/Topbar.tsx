// Global search and account controls displayed above each page.
import { useEffect, useState } from "react";
import { getConversations } from "../api";
import { brandLogoUrl } from "../constants";
import { IconBell, IconClose, IconSearch } from "./Icons";
import type { Conversation, CurrentUser } from "../types";

type TopbarProps = {
  currentUser: CurrentUser | null;
  query: string;
  onQueryChange: (query: string) => void;
  onNavigate: (path: string) => void;
};

function Topbar({ currentUser, query, onQueryChange, onNavigate }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Conversation[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Conversations are the app's actionable notifications: each one represents a booking thread.
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    setIsLoadingNotifications(true);
    void getConversations()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setIsLoadingNotifications(false));
  }, [currentUser]);

  const openConversation = () => {
    setShowNotifications(false);
    onNavigate("/messages");
  };

  return (
    <header className="topbar">
      <div className="mobile-brand" onClick={() => onNavigate("/")} style={{ cursor: "pointer" }}>
        <img className="brand-logo" src={brandLogoUrl} alt="Glam SA logo" />
        <span className="brand-title">Glam SA</span>
      </div>

      <div className="search-container">
        <label className="search-box">
          <IconSearch size={18} className="search-icon" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search hair, braids, makeup, nails, barber..."
            aria-label="Search looks and artists"
          />
          {query && (
            <button
              className="search-clear-btn"
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
            >
              <IconClose size={14} />
            </button>
          )}
        </label>
      </div>

      <div className="topbar-actions">
        <div className="notification-wrapper">
          <button
            className="icon-btn"
            aria-label="Notifications"
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <IconBell size={19} />
            {notifications.length > 0 && <span className="notification-count">{notifications.length > 9 ? "9+" : notifications.length}</span>}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <strong>Notifications</strong>
                {notifications.length > 0 && <span>{notifications.length} active</span>}
              </div>
              {!currentUser && <div className="notification-empty"><p>Sign in to see booking notifications.</p></div>}
              {currentUser && isLoadingNotifications && <div className="notification-empty"><p>Loading notifications...</p></div>}
              {currentUser && !isLoadingNotifications && notifications.length === 0 && <div className="notification-empty"><p>No booking notifications yet.</p></div>}
              {currentUser && !isLoadingNotifications && notifications.length > 0 && (
                <div className="notification-list">
                  {notifications.slice(0, 5).map((notification) => (
                    <button className="notification-item" type="button" key={notification.userId} onClick={openConversation}>
                      <span className="notification-avatar">{notification.name.charAt(0).toUpperCase()}</span>
                      <span className="notification-copy">
                        <strong>{notification.name}</strong>
                        <span>{notification.lastMessage}</span>
                      </span>
                    </button>
                  ))}
                  <button className="notification-view-all" type="button" onClick={openConversation}>View all messages</button>
                </div>
              )}
            </div>
          )}
        </div>

        {!currentUser ? (
          <button
            className="btn-outline-sm mobile-auth-btn"
            type="button"
            onClick={() => onNavigate("/profile")}
          >
            Sign in
          </button>
        ) : (
          <button
            className="topbar-avatar-btn"
            type="button"
            onClick={() => onNavigate("/login")}
            title="My Profile"
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </button>
        )}
      </div>
    </header>
  );
}

export default Topbar;
