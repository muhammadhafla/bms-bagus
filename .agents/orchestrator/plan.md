# Implementation Plan: BMS UI/UX Polish & Accessibility enhancements

We will implement Sprint 3 enhancements (Accessibility and UI/UX Polish) across the codebase.

## Milestone Decomposition

### Milestone 1: Accessibility Polish (R1)
1. **Modal.tsx**: Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` linking to the header title.
2. **PriceInput.tsx**: Ensure the `<label>` has `htmlFor` referencing a unique input ID. If no `id` is supplied to props, auto-generate a unique fallback ID using `useId` or a random string.
3. **DateRangePicker.tsx**: Add `aria-haspopup="dialog"`, `aria-expanded` and control relationships on the trigger button, and add `role="dialog"` or appropriate group labeling to the datepicker popup.
4. **ModernPagination.tsx**: Ensure the container has `role="navigation"` and `aria-label="Navigasi Halaman"`, with buttons having explicit `aria-label` tags for pagination actions.
5. **Search input in inventory/page.tsx**: Add `aria-label="Cari barang berdasarkan nama atau barcode"` to the text field.
6. **DataTable.tsx**: Add `aria-sort` (e.g. `ascending`, `descending`, or `none`) on sorted header cells.
7. **app/layout.tsx**: Remove viewport `userScalable: false` restriction so users can pinch-to-zoom.

### Milestone 2: UI Polish (R2)
1. **Toast.tsx**: Import and replace the `×` string in the close button with `<IconX />` from `@tabler/icons-react`.
2. **app/(main)/layout.tsx**: Wrap Sidebar links in a `Tooltip` showing the page name when the sidebar is collapsed (icon-only mode).
3. **ConfirmDialog.tsx**: Remove the manual `dialogRef.current?.focus()` call inside `useEffect` which conflicts with `autoFocus` on the Confirm button.
4. **app/(main)/layout.tsx**: Fix mobile menu toggle button z-index styling. Set it to a high z-index (e.g. `z-40` or higher) so it's not overlapped by page content, or adjust surrounding stacking contexts.

### Milestone 3: Testing & Code Auditing
1. Spawn workers/reviewers to verify compilation and linting:
   - Run `npm run lint` and verify no new warnings or errors.
   - Run `npm run tsc` to verify TypeScript compile-time safety.
   - Run `npm run build` to verify production compilation.
2. Spawn Forensic Auditor to verify no hardcodes/facades were introduced, ensuring compliance.
