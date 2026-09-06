// Mobile-only navigation bar for the primary application routes.
import { IconCalendar, IconCompass, IconHome, IconMessage, IconUpload, IconUser } from "./Icons";
import type { CurrentUser } from "../types";

type MobileNavProps = {
  pathname: string;
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

export function MobileNav({ pathname, currentUser, onNavigate }: MobileNavProps) {
  const isClient = currentUser?.accountType === "client";

  return (
    <nav className="mobile-nav-bar" aria-label="Mobile Navigation">
      {/* Feed */}
      <button
        type="button"
        className={`mobile-nav-item ${pathname === "/" ? "active" : ""}`}
        onClick={() => onNavigate("/")}
        aria-label="Feed"
      >
        <IconHome size={22} />
        <span>Feed</span>
      </button>

      {/* Discover */}
      <button
        type="button"
        className={`mobile-nav-item ${pathname === "/discover" ? "active" : ""}`}
        onClick={() => onNavigate("/discover")}
        aria-label="Discover"
      >
        <IconCompass size={22} />
        <span>Discover</span>
      </button>

      {/* Centre Action Button */}
      {isClient ? (
        <button
          type="button"
          className="mobile-nav-create-btn"
          onClick={() => onNavigate("/messages")}
          aria-label="My Appointments"
          title="My Appointments"
        >
          <div className="mobile-nav-create-circle">
            <IconCalendar size={20} />
          </div>
        </button>
      ) : (
        <button
          type="button"
          className="mobile-nav-create-btn"
          onClick={() => onNavigate("/upload")}
          aria-label="Share a look"
        >
          <div className="mobile-nav-create-circle">
            <IconUpload size={20} />
          </div>
        </button>
      )}

      {/* Messages */}
      <button
        type="button"
        className={`mobile-nav-item ${pathname === "/messages" ? "active" : ""}`}
        onClick={() => onNavigate(currentUser ? "/messages" : "/login")}
        aria-label="Messages"
      >
        <IconMessage size={22} />
        <span>Messages</span>
      </button>

      {/* Profile / Join */}
      <button
        type="button"
        className={`mobile-nav-item ${pathname === "/profile" || pathname === "/login" ? "active" : ""}`}
        onClick={() => onNavigate(currentUser ? "/profile" : "/login")}
        aria-label={currentUser ? "My profile" : "Join"}
      >
        {currentUser ? (
          <div className="mobile-avatar-icon">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
        ) : (
          <IconUser size={22} />
        )}
        <span>{currentUser ? "Profile" : "Join"}</span>
      </button>
    </nav>
  );
}

export default MobileNav;
