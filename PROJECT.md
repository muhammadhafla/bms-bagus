# Project: BMS UI/UX Polish & Accessibility Polish

## Architecture
- React / Next.js application using Tailwind CSS for styling and `@tabler/icons-react` for iconography.
- Global application context: `app/layout.tsx` wraps providers (Query, Auth, DarkMode, Toast).
- Main sidebar and mobile layout: `app/(main)/layout.tsx` controls sidebar expansion/collapsing, tooltips, auto-hide feature, and mobile menu state.
- Components to be polished:
  - `components/ui/Modal.tsx`
  - `components/ui/PriceInput.tsx`
  - `components/ui/DateRangePicker.tsx`
  - `components/ui/ModernPagination.tsx`
  - `components/ui/DataTable/DataTable.tsx`
  - `components/ui/ConfirmDialog.tsx`
  - `components/ui/Toast.tsx`
  - `app/(main)/inventory/page.tsx` (Search input)
  - `app/layout.tsx` (Viewport configuration)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Accessibility Enhancements (R1) | Add ARIA properties, fix HTML link tags, and update layout viewport properties | None | DONE |
| 2 | M2: UI Polish (R2) | Replace characters with SVG icons, fix conflicting focuses, fix z-index layering, implement tooltips | M1 | DONE |
| 3 | M3: Build & Static Verification | Run eslint, tsc, and next build, run forensic audit checks | M2 | IN_PROGRESS |

## Code Layout
- Foundational UI controls: `components/ui/*`
- Application layouts: `app/(main)/layout.tsx`, `app/layout.tsx`
- Search bar: `app/(main)/inventory/page.tsx`
- Core hooks & stores: `hooks/`, `lib/`

## Interface Contracts
- No API signature changes are required, but internal elements are linked via ID props (e.g. `htmlFor` matching input `id`).
