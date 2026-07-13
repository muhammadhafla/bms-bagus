# Accessibility Refinements Review Report (R2)

## Review Summary

**Verdict**: APPROVE

The accessibility refinements implemented in `components/ui/DateRangePicker.tsx`, `components/ui/DataTable/DataTable.tsx`, and `components/ui/DataTable/Pagination.tsx` successfully address all outstanding accessibility issues, including desktop focus management, Escape key dismissal, semantic mobile table roles, and pagination alignment. All accessibility-related unit tests are passing, and verification checks (`npm run lint` and `npm run tsc`) succeed without errors.

---

## Findings

### [Minor] Finding 1: Dangling Timeout in `useFocusTrap` Hook
- **What**: The `setTimeout` used to defer focus on mounting is not cleared if the component unmounts before the timeout fires.
- **Where**: `lib/hooks/useFocusTrap.ts` (Lines 25–27)
- **Why**: If a dialog opens and is closed immediately (within 50ms), the focus callback will still execute. While calling `.focus()` on a detached element is safe and does not crash the browser, it is a minor code hygiene issue.
- **Suggestion**: Store the timeout ID and clear it in the `useEffect` cleanup function.

### [Major] Finding 2: Unrelated Store Test Failures in `lib/store.test.ts`
- **What**: Two business logic tests in `lib/store.test.ts` fail under the current workspace changes.
- **Where**: `lib/store.test.ts` and `lib/store.ts`
- **Why**: Recent changes shifted the store APIs from using array index based lookups to item ID based lookups. This broke two test assumptions:
  1. `addItem` duplicates items if they have different discounts, but the hook merges them since it only checks `i.id === item.id && i.harga_beli === item.harga_beli`.
  2. `updateHargaBeli` overwrites `harga_final` without subtracting the discount (`diskon`), causing assertion mismatches.
  These failures are entirely unrelated to the accessibility task.
- **Suggestion**: The implementer or core team should fix the business logic or adjust the unit tests in a separate branch/milestone.

---

## Verified Claims

- **DateRangePicker Escape Dismiss** → verified via code review and unit tests → **PASS**
  - Pressing `Escape` now properly calls `setIsOpen(false)` to close the calendar popover.
- **DateRangePicker Focus Trap & Restoration** → verified via code review and unit tests → **PASS**
  - The custom `useFocusTrap` hook successfully traps focus within the popover dialog when open and restores focus back to the trigger button when closed.
- **DateRangePicker Desktop Close Button** → verified via code review → **PASS**
  - Removed `sm:hidden` from the popover close header container, making the close button visible and focusable across all viewports.
- **DataTable Mobile Row Semantics** → verified via code review and unit tests → **PASS**
  - Container now uses `role="list"`, and rows use `role="button"` when interactive (or `role="listitem"` otherwise).
- **DataTable Keyboard Row Navigation** → verified via code review → **PASS**
  - Keyboard users can now navigate interactive mobile rows using `ArrowUp`/`ArrowDown` and trigger them using `Enter`/`Space`.
- **DataTable/Pagination Accessibility Alignment** → verified via code review and unit tests → **PASS**
  - Standard pagination now aligns with `ModernPagination.tsx` using `<nav role="navigation">`, dynamic `aria-current="page"`, Indonesian `aria-label` translations, and `aria-hidden="true"` on chevrons.
- **ESLint and TS Checks** → verified via running commands `npm run lint` and `npm run tsc` → **PASS**
  - No errors or lint warnings were reported.

---

## Coverage Gaps

- **Store Business Logic Tests** — risk level: **Medium** — recommendation: **Investigate and resolve separately**
  - While accessibility components are verified, the failing store tests must be addressed to ensure system logic consistency.

---

## Unverified Items

- **Visual Focus Ring Visibility & Color Contrast** — reason not verified:
  - This requires a visual browser environment or automated color contrast scans (e.g., Axe) which are out of scope for command-line verification.
