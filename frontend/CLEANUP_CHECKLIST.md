# Frontend Code Cleanup Checklist

## 🟢 Completed (September 12, 2026)
- [x] Centralized duplicate icon definitions (IconChevronLeft, IconChevronRight)
- [x] Removed console.error() from usePullToRefresh.ts
- [x] Removed unused postImageUrl parameter from BookingModal
- [x] Verified TypeScript compilation passes

## 🟡 Medium Priority (Next Sprint)

### Storage Constants Consolidation
- [ ] Audit all localStorage/sessionStorage key usage
- [ ] Create `frontend/src/constants/storage.ts`
- [ ] Move keys:
  - `ONBOARDING_STORAGE_KEY` from OnboardingWalkthrough.tsx
  - Any user preference keys
  - Any cache keys
- [ ] Update imports in App.tsx, AuthSection.tsx, OnboardingWalkthrough.tsx
- [ ] Add TypeScript enums for storage keys
- **Files**: OnboardingWalkthrough.tsx, AuthSection.tsx, App.tsx
- **Effort**: 20 min
- **Priority**: HIGH

### Error Handling Standardization
- [ ] Audit error handling patterns in:
  - `api.ts` - All fetch/response error handling
  - `PostCard.tsx` - Error states in booking/like/save
  - `BookingModal.tsx` - Booking submission errors
  - All components using toast notifications
- [ ] Create `frontend/src/utils/errorHandling.ts`:
  ```typescript
  export function parseApiError(response: Response, context: string): string
  export function getErrorMessage(error: unknown, fallback: string): string
  export interface ApiError { code: string; message: string }
  ```
- [ ] Replace all error parsing with utility functions
- [ ] Document error conventions in ERROR_HANDLING.md
- **Files**: api.ts, components/*, utils/*
- **Effort**: 1-2 hours
- **Priority**: HIGH

### JSDoc Documentation
- [ ] Add JSDoc to all exported functions in:
  - `api.ts` - All API endpoints
  - `hooks/usePullToRefresh.ts`
  - `hooks/useSwipeGesture.ts`
  - `utils/searchQuery.ts`
  - `utils/router.ts`
  - Other utility functions
- [ ] Include: @param, @returns, @throws, examples where helpful
- [ ] Run TypeScript JSDoc linter
- **Files**: api.ts, hooks/*, utils/*
- **Effort**: 45 min
- **Priority**: MEDIUM

### Type Safety Audit
- [ ] Replace `as` type assertions with explicit types
- [ ] Ensure all function return types are explicit (not inferred)
- [ ] Use `satisfies` operator where appropriate (TS 4.9+)
- [ ] Run stricter TypeScript checks
- **Files**: Identify with `tsc --strict` flag
- **Effort**: 30 min
- **Priority**: MEDIUM

---

## 🔴 Low Priority (Later)

### CSS Organization
- [ ] Run PurgeCSS to find unused selectors
- [ ] Audit CSS files for duplicates:
  - `styles/mobile-polish.css`
  - `styles/responsive-overrides.css`
  - `styles/shell-overrides.css`
  - `styles/booking-overrides.css`
- [ ] Consider consolidating override patterns
- [ ] Document CSS architecture in CSS_ORGANIZATION.md
- **Files**: styles/
- **Effort**: 1 hour
- **Priority**: LOW

### Dead Code Audit
- [ ] Search for unused variables (ESLint)
- [ ] Remove unused exports
- [ ] Verify FEATURED_STORIES usage in StoriesReel.tsx
- [ ] Check if all constants in `constants.ts` are imported
- [ ] Document intentionally unused params with comments
- **Effort**: 20 min
- **Priority**: LOW

### Unused Imports Removal
- [ ] Run ESLint to find unused imports
- [ ] Remove from:
  - All component files
  - All utility files
  - All hook files
- **Command**: `npm run lint -- --fix`
- **Effort**: 10 min
- **Priority**: LOW

---

## 🔧 Tools & Commands

### Run Linting
```bash
# Basic ESLint
npm run lint

# Strict mode (catch unused vars)
npm run lint -- --max-warnings 0

# Fix auto-fixable issues
npm run lint -- --fix
```

### Type Checking
```bash
# Default check
npm run type-check

# Strict mode
npx tsc --strict --noEmit
```

### Find Unused Code
```bash
# Install tool
npm install -D unused-exports

# Run analysis
npx unused-exports
```

### CSS Analysis
```bash
# Install PurgeCSS
npm install -D purgecss

# Analyze CSS
npx purgecss --css src/styles/*.css --content src/**/*.tsx
```

---

## 📋 Quality Gates Checklist

Before committing cleanup changes:
- [ ] Run `npm run lint` - ESLint passes with zero warnings
- [ ] Run `npm run type-check` - TypeScript passes without errors
- [ ] Run tests (if available) - All tests pass
- [ ] Check browser console - No errors or warnings
- [ ] Verify bundle size - Should stay same or decrease
- [ ] Test affected components manually

---

## 📚 Documentation to Create

- [ ] `ERROR_HANDLING.md` - Error patterns and standards
- [ ] `CSS_ORGANIZATION.md` - CSS architecture and specificity order
- [ ] `STORAGE_KEYS.md` - All localStorage/sessionStorage keys documented
- [ ] Update `CONTRIBUTING.md` with cleanup expectations

---

## 🎯 Success Metrics

After all cleanup completed:
- ✅ Zero unused imports (ESLint check)
- ✅ Zero unused variables (ESLint check)
- ✅ 100% error handling consistency
- ✅ 100% JSDoc coverage on exported functions
- ✅ No duplicate component definitions
- ✅ Centralized all constants and storage keys
- ✅ Build passes with `npm run lint -- --max-warnings 0`

---

## 🚀 Implementation Tips

### For Developers
1. Run cleanup checks before each PR
2. Use `--fix` flag in ESLint to auto-fix simple issues
3. Reference this checklist during code review
4. Flag duplications early

### For Code Review
1. Point to checklist items when requesting cleanup
2. Include cleanup in "Definition of Done"
3. Set cleanup effort expectations

### For CI/CD
Consider adding to pre-commit hook:
```bash
#!/bin/bash
npm run lint -- --max-warnings 0 || exit 1
npm run type-check || exit 1
```

---

## ✏️ Notes

- This checklist is living document - update as cleanup needs evolve
- Prioritize based on code quality impact vs effort required
- Bundle size analysis important before/after CSS cleanup
- Consider developer experience when organizing utilities

Last Updated: September 12, 2026
