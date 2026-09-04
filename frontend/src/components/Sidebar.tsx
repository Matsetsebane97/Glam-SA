// Desktop navigation and the signed-in user's quick profile summary.
import type { ReactNode } from "react";
import { brandLogoUrl, navItems } from "../constants";
import { IconCompass, IconHome, IconMessage, IconUpload, IconVerified } from "./Icons";
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
  Upload: <IconUpload size={20} />,
};

function Sidebar({ activeNav, currentUser, onNavigate, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {/* Brand Header */}
        <div className="brand" onClick={() => onNavigate("/")} style={{ cursor: "pointer" }}>
          <div className="brand-logo-container">
            <img className="brand-logo" src={brandLogoUrl} alt="Glam SA logo" />
          </div>
          <div className="brand-text">
            <strong>Glam SA</strong>
            <span className="brand-subtitle">Beauty & Hair Community</span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = activeNav === item;

            return (
              <button
                key={item}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (item === "Upload") onNavigate("/upload");
                  if (item === "Home") onNavigate("/");
                  if (item === "Discover") onNavigate("/discover");
                  if (item === "Messages") onNavigate("/messages");
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  {navIcons[item]}
                </span>
                <span className="nav-label">{item}</span>
                {isActive && <div className="nav-active-indicator" />}
              </button>
            );
          })}
        </nav>

        {/* Quick Share Action */}
        <div className="sidebar-action-wrap">
          {/* Keep the two most common creation and discovery actions visible. */}
          <button
            className="btn-primary sidebar-create-btn"
            type="button"
            onClick={() => onNavigate("/upload")}
          >
            <IconUpload size={18} />
            <span>Share Your Look</span>
          </button>
          <button
            className="btn-ghost sidebar-map-btn"
            type="button"
            onClick={() => onNavigate("/discover")}
          >
            <IconCompass size={18} />
            <span>Find an Artist on Map</span>
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="sidebar-bottom">
        <div className="profile-card">
          <div className="profile-avatar" aria-hidden="true">
            {(currentUser?.name || "G").charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <div className="profile-name-row">
              <strong>{currentUser ? currentUser.name : "Guest Visitor"}</strong>
              {currentUser && <IconVerified size={13} />}
            </div>
            <small className="profile-handle">
              {currentUser ? currentUser.handle : "Sign in to save looks"}
            </small>
            {currentUser?.locationLabel && (
              <small className="profile-location">{currentUser.locationLabel}</small>
            )}
          </div>
          <div className="profile-card-actions">
            <button
              className="btn-outline-sm profile-btn"
              type="button"
              onClick={() => onNavigate(currentUser ? "/profile" : "/login")}
            >
              {currentUser ? "Account" : "Join"}
            </button>
            {currentUser && (
              <button className="btn-outline-sm profile-btn" type="button" onClick={() => onNavigate("/settings")}>
                Settings
              </button>
            )}
            {currentUser && (
              <button className="btn-outline-sm sidebar-logout-btn" type="button" onClick={onLogout}>
                Log out
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
