// Shared navigation, location options, and fallback display values used by the app shell.
import type { NavItem } from "./types";

export const brandLogoUrl = `${import.meta.env.BASE_URL}logo-mark.svg`;

export const southAfricanProvinces = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape",
];

export const citiesByProvince: Record<string, string[]> = {
  "Eastern Cape": ["East London", "Gqeberha", "Mthatha"],
  "Free State": ["Bloemfontein", "Welkom"],
  Gauteng: ["Johannesburg", "Pretoria", "Soweto", "Midrand", "Vanderbijlpark"],
  "KwaZulu-Natal": ["Durban", "Pietermaritzburg", "Richards Bay"],
  Limpopo: ["Polokwane", "Thohoyandou", "Tzaneen"],
 Mpumalanga: ["Mbombela", "Emalahleni", "Secunda"],
  "Northern Cape": ["Kimberley", "Upington"],
  "North West": ["Mahikeng", "Rustenburg", "Klerksdorp"],
  "Western Cape": ["Cape Town", "Stellenbosch", "George", "Paarl"],
};

export const navItems: NavItem[] = ["Home", "Discover", "Messages", "Saved", "Upload"];

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
  if (path === "/saved") return "Saved";
  return "Home";
};
