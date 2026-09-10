// Mobile-only frosted glass bottom navigation with centre FAB.
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

      {/* Centre FAB */}
      {isClient ? (
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
      ) : (
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

      {/* Messages */}
      <button
        type="button"
        className={`mobile-nav-tab${pathname === "/messages" ? " active" : ""}`}
        onClick={() => onNavigate(currentUser ? "/messages" : "/login")}
        aria-label="Messages"
      >
        <IconMessage size={21} />
        <span>Messages</span>
      </button>

      {/* Profile */}
      <button
        type="button"
        className={`mobile-nav-tab${pathname === "/profile" || pathname === "/login" ? " active" : ""}`}
        onClick={() => onNavigate(currentUser ? "/profile" : "/login")}
        aria-label={currentUser ? "My profile" : "Join"}
      >
        {currentUser ? (
          <div className="mobile-nav-avatar">
            {currentUser.profilePhotoUrl ? (
              <img src={currentUser.profilePhotoUrl} alt={currentUser.name} />
            ) : (
              currentUser.name.charAt(0).toUpperCase()
            )}
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
