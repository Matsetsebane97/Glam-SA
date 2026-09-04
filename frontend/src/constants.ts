// Shared navigation and fallback display values used by the app shell.
import type { NavItem } from "./types";

export const brandLogoUrl = `${import.meta.env.BASE_URL}logo-mark.svg`;

export const navItems: NavItem[] = ["Home", "Discover", "Messages", "Upload"];

export const fallbackCategories = ["Hair", "Nails", "Barbering", "Makeup", "Skincare", "Tattoos"];

export const navForPath = (path: string): NavItem => {
  if (path === "/upload") return "Upload";
  if (path === "/discover") return "Discover";
  if (path === "/messages") return "Messages";
  return "Home";
};
