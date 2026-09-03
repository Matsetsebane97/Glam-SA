// Mobile-only navigation bar for the primary application routes.
import { IconCompass, IconHome, IconUpload, IconUser } from "./Icons";
import type { CurrentUser } from "../types";

type MobileNavProps = {
  pathname: string;
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

export function MobileNav({ pathname, currentUser, onNavigate }: MobileNavProps) {
  return (
    <nav className="mobile-nav-bar" aria-label="Mobile Navigation">
      <button
        type="button"
        className={`mobile-nav-item ${pathname === "/" ? "active" : ""}`}
        onClick={() => onNavigate("/")}
      >
        <IconHome size={22} />
        <span>Feed</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${pathname === "/discover" ? "active" : ""}`}
        onClick={() => onNavigate("/discover")}
      >
        <IconCompass size={22} />
        <span>Map</span>
      </button>

      <button
        type="button"
        className="mobile-nav-create-btn"
        onClick={() => onNavigate("/upload")}
        aria-label="Create Post"
      >
        <div className="mobile-nav-create-circle">
          <IconUpload size={20} />
        </div>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${pathname === "/profile" || pathname === "/login" ? "active" : ""}`}
        onClick={() => onNavigate(currentUser ? "/profile" : "/login")}
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
