// Desktop navigation — icon-rail with labels, rose-gold active states, avatar cluster at bottom.
import type { ReactNode } from "react";
import { brandLogoUrl, navItems } from "../constants";
import {
  IconCalendar,
  IconBookmark,
  IconCompass,
  IconGrid,
  IconHome,
  IconMessage,
  IconSparkles,
  IconUpload,
  IconUser,
  IconVerified,
} from "./Icons";
import type { CurrentUser, NavItem } from "../types";

type SidebarProps = {
  activeNav: NavItem;
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
};

const navIcons: Record<NavItem, ReactNode> = {
  Home: <IconHome size={20} />,
  Discover: <IconCompass size={20} />,
  Messages: <IconMessage size={20} />,
  Saved: <IconBookmark size={20} />,
  Upload: <IconUpload size={20} />,
};

function Sidebar({ activeNav, currentUser, onNavigate, onLogout }: SidebarProps) {
  const isCreator = currentUser?.accountType === "creator";
  const isClient = currentUser?.accountType === "client";
  const visibleNavItems = navItems.filter((item) => (isClient ? item !== "Upload" : true));

  return (
    <aside className="sidebar">
      {/* Brand logo mark */}
      <div className="sidebar-brand" onClick={() => onNavigate("/")} role="button" tabIndex={0} aria-label="Go to home">
        <div className="sidebar-logo-ring">
          <img className="sidebar-logo-img" src={brandLogoUrl} alt="Glam SA logo" />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Glam SA</span>
          <span className="sidebar-brand-sub">Beauty Community</span>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {visibleNavItems.map((item) => {
          const isActive = activeNav === item;
          return (
            <button
              key={item}
              className={`sidebar-nav-item${isActive ? " active" : ""}`}
              onClick={() => {
                if (item === "Upload") onNavigate("/upload");
                if (item === "Home") onNavigate("/");
                if (item === "Discover") onNavigate("/discover");
                if (item === "Messages") onNavigate("/messages");
                if (item === "Saved") onNavigate("/saved");
              }}
            >
              <span className="sidebar-nav-icon">{navIcons[item]}</span>
              <span className="sidebar-nav-label">
                {item === "Messages" && isClient ? "Appointments" : item}
              </span>
              {isActive && <span className="sidebar-nav-pip" aria-hidden="true" />}
            </button>
          );
        })}
      </nav>

      {/* Role-based CTA */}
      <div className="sidebar-cta-group">
        {isClient && (
          <button className="sidebar-cta-ghost" type="button" onClick={() => onNavigate("/dashboard")}>
            <IconCalendar size={16} />
            <span>Client dashboard</span>
          </button>
        )}
        {currentUser?.isStaff && (
          <button className="sidebar-cta-ghost" type="button" onClick={() => onNavigate("/admin-dashboard")}>
            <IconGrid size={16} />
            <span>Admin dashboard</span>
          </button>
        )}
        {isClient ? (
          <>
            <button className="sidebar-cta-primary" type="button" onClick={() => onNavigate("/discover")}>
              <IconCompass size={17} />
              <span>Find Artists</span>
            </button>
            <button className="sidebar-cta-ghost" type="button" onClick={() => onNavigate("/messages")}>
              <IconCalendar size={16} />
              <span>My Appointments</span>
            </button>
          </>
        ) : (
          <>
            <button className="sidebar-cta-primary" type="button" onClick={() => onNavigate("/upload")}>
              <IconUpload size={17} />
              <span>Share Your Look</span>
            </button>
            <button className="sidebar-cta-ghost" type="button" onClick={() => onNavigate("/discover")}>
              <IconCompass size={16} />
              <span>Artist Map</span>
            </button>
          </>
        )}
      </div>

      {/* User profile cluster */}
      <div className="sidebar-profile-cluster">
        <div
          className="sidebar-profile-avatar"
          aria-hidden="true"
          onClick={() => onNavigate(currentUser ? "/profile" : "/login")}
          style={{ cursor: "pointer" }}
        >
          {currentUser?.profilePhotoUrl ? (
            <img src={currentUser.profilePhotoUrl} alt={currentUser.name} />
          ) : (
            <span>{(currentUser?.name || "G").charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="sidebar-profile-info">
          <div className="sidebar-profile-name">
            <strong>{currentUser ? currentUser.name : "Guest"}</strong>
            {isCreator && <IconVerified size={13} />}
          </div>
          {currentUser && (
            <span className={`user-role-badge ${currentUser.accountType || "creator"}`}>
              {currentUser.accountType === "client" ? (
                <><IconUser size={10} /> Client</>
              ) : (
                <><IconSparkles size={10} /> Creator</>
              )}
            </span>
          )}
          <small className="sidebar-profile-handle">
            {currentUser ? currentUser.handle : "Sign in to continue"}
          </small>
        </div>

        <div className="sidebar-profile-actions">
          <button
            className="btn-outline-sm"
            type="button"
            onClick={() => onNavigate(currentUser ? "/profile" : "/login")}
          >
            {currentUser ? "Profile" : "Join"}
          </button>
          {currentUser && (
            <button className="btn-outline-sm sidebar-logout-btn" type="button" onClick={onLogout}>
              Out
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
