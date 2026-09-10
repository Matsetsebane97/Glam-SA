// Shared navigation and fallback display values used by the app shell.
import type { NavItem } from "./types";

export const brandLogoUrl = `${import.meta.env.BASE_URL}logo-mark.svg`;

export const navItems: NavItem[] = ["Home", "Discover", "Messages", "Upload"];

export const fallbackCategories = [
  "Bridal",
  "Nails",
  "Barbering",
  "Makeup",
  "Skincare",
  "Tattoos",
  "Lashes & Brows",
  "Locs & Dreadlocks",
  "Wigs & Weaves",
  "Natural Hair",
  "Spa & Wellness",
  "Massage",
  "Waxing & Hair Removal",
  "Piercing",
  "Teeth Whitening",
  "Aesthetics & Injectables",
  "Men's Grooming",
  "Beauty Courses",
];

export const navForPath = (path: string): NavItem => {
  if (path === "/upload") return "Upload";
  if (path === "/discover") return "Discover";
  if (path === "/messages") return "Messages";
  return "Home";
};
