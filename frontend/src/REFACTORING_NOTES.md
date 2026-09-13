# App.tsx Refactoring

## Overview
Refactored the monolithic 350-line `App.tsx` into smaller, focused modules to improve maintainability and readability.

## Changes

### Files Created

#### 1. `utils/searchQuery.ts` (107 lines)
**Responsibility**: Smart search query parsing
- Extracts `categoryAliases` mapping (50+ categories)
- Extracts `searchStopWords` set
- Exports `parseSmartQuery()` function
- Exports `formatSearchSummary()` helper
- Handles natural language queries like "braids near Sandton under R500"

**Benefits**:
- Isolates search logic for easy testing
- Reusable across the app
- Clear separation of concerns

#### 2. `utils/router.ts` (27 lines)
**Responsibility**: Client-side navigation utilities
- `navigate(path)`: Push state without page reload
- `getCurrentPathname()`: Get current path
- `onPathnameChange(callback)`: Listen for pathname changes

**Benefits**:
- Encapsulates routing logic
- Can be extended with route guards, middleware, etc.
- Testable navigation

#### 3. `pages/PageRouter.tsx` (157 lines)
**Responsibility**: Page routing and rendering
- Type: `PageRouterProps` defines all page router inputs
- Function: `renderPage()` routes pathname to components
- Handles all 13 page routes with proper prop passing

**Benefits**:
- Centralized routing logic
- Easy to add new routes
- Single source of truth for page props
- Separated from App state management

### Files Modified

#### `App.tsx` (234 lines, down from 350)
**Before**: 350 lines
- ~80 lines of category aliases
- ~5 lines of stop words
- ~25 lines of parseSmartQuery function
- ~200 lines of App component
- ~50 lines of renderPage function

**After**: 234 lines
- Imports extracted utilities
- Clean App component with focused state management
- AppContent component separated for hook usage
- ~120 lines of business logic + structure

**New structure**:
```typescript
App
├─ State management (auth, search, posts, navigation)
├─ Effects (auth, router, data loading)
├─ Search logic (reuses parseSmartQuery)
└─ AppContent (layout + page rendering)

AppContent
├─ useToast hook (inside ToastProvider)
├─ renderPage delegation
└─ Layout (Sidebar, Topbar, RightRail, etc.)
```

## Architecture Decisions

### 1. Extracted Logic into Utils
**Why**: Constants and algorithms don't need to be in the component
- Makes them testable
- Enables reuse
- Easier to maintain

### 2. Created PageRouter Module
**Why**: Routing logic is separate from state management
- Easier to add routes
- Props are explicitly typed
- Each page gets what it needs
- Future-proof for routing library migration

### 3. Split App and AppContent
**Why**: `useToast` hook needs to be inside `ToastProvider`
- App provides context setup
- AppContent consumes context
- Cleaner than passing toast through all props

### 4. Kept Auth and Search Logic in App
**Why**: They're global state concerns
- Auth affects entire app
- Search filters posts
- Both needed in multiple places
- Dependencies: auth → posts, search → filtering

## File Organization

```
src/
├─ App.tsx (234 lines) - Main app + state
├─ utils/
│  ├─ searchQuery.ts (107 lines) - Search parsing
│  └─ router.ts (27 lines) - Navigation
└─ pages/
   └─ PageRouter.tsx (157 lines) - Page routing
```

## Benefits of Refactoring

✅ **Maintainability**: Smaller files, clearer responsibilities
✅ **Testability**: Logic extracted to pure functions
✅ **Reusability**: Utils can be imported elsewhere
✅ **Scalability**: Easy to add features (new routes, search filters)
✅ **Readability**: Clear imports and module boundaries
✅ **Type Safety**: Props explicitly typed in PageRouter

## Migration Path if Needed

If you want to add a routing library (React Router, TanStack Router, etc.):
1. The routing logic is already isolated in `PageRouter.tsx`
2. Can be gradually replaced with library routes
3. `utils/router.ts` can be deprecated
4. `utils/searchQuery.ts` remains useful

## Testing

To test the extracted modules:

```typescript
// searchQuery.test.ts
import { parseSmartQuery, formatSearchSummary } from "../utils/searchQuery";

test("parses 'braids near Sandton under R500'", () => {
  const result = parseSmartQuery("braids near Sandton under R500");
  expect(result.category).toBe("Hair");
  expect(result.location).toBe("Sandton");
  expect(result.maxPrice).toBe(500);
});
```

## Next Steps

- Consider adding unit tests for `searchQuery.ts`
- Monitor performance (should be no change)
- Add more detailed route comments if needed
