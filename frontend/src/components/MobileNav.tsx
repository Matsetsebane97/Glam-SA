// Mobile-only frosted glass bottom navigation with centre FAB.
import { useEffect, useState } from "react";
import {
  IconCalendar,
  IconCompass,
  IconHome,
  IconMessage,
  IconUpload,
  IconUser,
} from "./Icons";
import { getConversations, getBookings } from "../api";
import type { CurrentUser } from "../types";

type MobileNavProps = {
  pathname: string;
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

export function MobileNav({
  pathname,
  currentUser,
  onNavigate,
}: MobileNavProps) {
  const isClient = currentUser?.accountType === "client";
  const isCreator = currentUser?.accountType === "creator";
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread message + pending booking count so the Messages tab shows a badge.
  // We mirror a lightweight version of what Topbar does, but we only track the count.
  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    void Promise.all([
      getConversations().catch(() => []),
      getBookings().catch(() => []),
    ]).then(([convs, bookings]) => {
      if (cancelled) return;
      const msgUnread = convs.reduce((n, c) => n + (c.unreadCount ?? 0), 0);
      const pendingBookings = bookings.filter(
        (b) => b.isCreator && b.status === "requested",
      ).length;
      setUnreadCount(msgUnread + pendingBookings);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser, pathname]); // re-check when navigating back to messages

  return (
    <nav className="mobile-nav" aria-label="Mobile Navigation">
      {/* Feed */}
      <button
        type="button"
        className={`mobile-nav-tab${pathname === "/" ? " active" : ""}`}
        onClick={() => onNavigate("/")}
        aria-label="Feed"
      >
        <IconHome size={21} />
        <span>Feed</span>
      </button>

      {/* Discover */}
      <button
        type="button"
        className={`mobile-nav-tab${pathname === "/discover" ? " active" : ""}`}
        onClick={() => onNavigate("/discover")}
        aria-label="Discover"
      >
        <IconCompass size={21} />
        <span>Discover</span>
      </button>

      {/* Centre FAB — role-aware */}
      {!currentUser ? (
        // Unauthenticated: prompt to join rather than showing a creator-only Upload FAB
        <button
          type="button"
          className="mobile-nav-fab"
          onClick={() => onNavigate("/login")}
          aria-label="Join Glam SA"
        >
          <div className="mobile-nav-fab-circle mobile-nav-fab-join">
            <IconUser size={20} />
          </div>
        </button>
      ) : isClient ? (
        <button
          type="button"
          className="mobile-nav-fab"
          onClick={() => onNavigate("/messages")}
          aria-label="My Appointments"
        >
          <div className="mobile-nav-fab-circle">
            <IconCalendar size={22} />
          </div>
        </button>
      ) : isCreator ? (
        <button
          type="button"
          className="mobile-nav-fab"
          onClick={() => onNavigate("/upload")}
          aria-label="Share a look"
        >
          <div className="mobile-nav-fab-circle">
            <IconUpload size={22} />
          </div>
        </button>
      ) : (
        // Fallback for any other account type
        <button
          type="button"
          className="mobile-nav-fab"
          onClick={() => onNavigate("/upload")}
          aria-label="Share a look"
        >
          <div className="mobile-nav-fab-circle">
            <IconUpload size={22} />
          </div>
        </button>
      )}

      {/* Messages — with unread badge */}
      <button
        type="button"
        className={`mobile-nav-tab${pathname === "/messages" ? " active" : ""}`}
        onClick={() => onNavigate(currentUser ? "/messages" : "/login")}
        aria-label={
          unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"
        }
      >
        <span className="mobile-nav-icon-wrap">
          <IconMessage size={21} />
          {unreadCount > 0 && (
            <span className="mobile-nav-badge" aria-hidden="true">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        <span>Messages</span>
      </button>

      {/* Profile */}
      <button
        type="button"
        className={`mobile-nav-tab${pathname === "/profile" || pathname === "/login" ? " active" : ""}`}
        onClick={() => onNavigate(currentUser ? "/profile" : "/login")}
        aria-label={currentUser ? "My profile" : "Join"}
      >
        {currentUser?.profilePhotoUrl ? (
          <div className="mobile-nav-avatar">
            <img src={currentUser.profilePhotoUrl} alt={currentUser.name} />
          </div>
        ) : (
          <IconUser size={21} />
        )}
        <span>{currentUser ? "Profile" : "Join"}</span>
      </button>
    </nav>
  );
}

export default MobileNav;
