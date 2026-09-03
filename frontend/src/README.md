# Frontend File Map

Use this as the quick guide when changing the interface or logic.

- `App.tsx`: App coordinator. Keeps route state, loads API data, filters posts, and chooses the current page.
- `api.ts`: Backend calls for current user, categories, and posts.
- `constants.ts`: Shared fixed values like navigation items and fallback categories.
- `types.ts`: Shared TypeScript types used across the app.
- `components/AuthSection.tsx`: Login and signup form.
- `components/UploadSection.tsx`: Upload form for image/video posts.
- `components/Sidebar.tsx`: Desktop sidebar navigation and profile area.
- `components/Topbar.tsx`: Mobile/header search, login, notifications, and upload shortcut.
- `components/CategoryTabs.tsx`: Horizontal category filter buttons.
- `components/PostCard.tsx`: One feed post, including media and actions.
- `components/RightRail.tsx`: Right-side trend and creator placeholder column.
- `pages/HomePage.tsx`: Main feed screen.
- `pages/LoginPage.tsx`: Account access screen.
- `pages/UploadPage.tsx`: Dedicated upload screen.
- `App.css`: App-specific layout and visual styling.
- `index.css`: Global defaults and form/auth base styles.
