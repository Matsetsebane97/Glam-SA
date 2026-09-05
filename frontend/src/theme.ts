// src/theme.ts
export const setTheme = (theme: 'light' | 'dark') => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  localStorage.setItem('theme', theme);
};

export const initTheme = () => {
  const saved = (localStorage.getItem('theme') as 'light' | 'dark' | null);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved ?? (prefersDark ? 'dark' : 'light'));
};
