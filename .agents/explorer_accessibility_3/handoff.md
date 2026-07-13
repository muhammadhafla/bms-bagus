# Handoff Report - Accessibility Polish (R1)

## 1. Observation
We observed the following in the target files:
* **Search Input**: In `app/(main)/inventory/page.tsx` (lines 207-214), the `<input>` element does not have an associated label or `aria-label`/`aria-labelledby` attribute.
  ```tsx
  <input
    ref={searchInputRef}
    type="text"
    placeholder="Cari nama atau barcode"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full pl-9 pr-3 py-2 sm:py-3 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-sm sm:text-base"
  />
  ```
* **Table Headers**: In `components/ui/DataTable/DataTable.tsx` (lines 109-135), the `<th>` elements rendered for each column do not specify the `aria-sort` attribute, leaving screen reader users unaware of the sort status of the columns.
  ```tsx
  {columns.map((col) => (
    <th
      key={col.key}
      className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400"
      style={{ width: col.width }}
    >
  ```

## 2. Logic Chain
1. To make the search input accessible to screen readers, it needs an accessible name. Adding `aria-label="Cari nama atau barcode"` directly to the `<input>` provides this name matching the existing placeholder.
2. For the DataTable headers, the WAI-ARIA guidelines state that the `aria-sort` attribute should be set on column header elements (`<th>` / `columnheader`) to communicate sorting state.
3. If a column is sortable (`col.sortable` is true), its sort state should be:
   * `"ascending"` when it is active (`sortKey === col.key`) and sorted in ascending order (`sortDirection === 'asc'`).
   * `"descending"` when active and sorted in descending order (`sortDirection === 'desc'`).
   * `"none"` when the column is sortable but not currently the sorting key.
4. If a column is not sortable, `aria-sort` should not be defined (`undefined`).
5. This is achieved by adding `aria-sort` to the `<th>` tag using a ternary expression based on `col.sortable`, `sortKey`, and `sortDirection`.

## 3. Caveats
* Pre-existing failures were found in `lib/store.test.ts` (8 out of 110 tests failed) during `npm run test:run`. These are unrelated to the current accessibility requirements or files being examined.
* Verification of accessibility properties depends on static analysis or manual accessibility tree inspection because there are no automated unit tests written for UI component rendering or accessibility attributes in the workspace.

## 4. Conclusion
We have identified the exact target points and drafted clean replacement chunks to resolve the accessibility deficiencies:
* Add `aria-label="Cari nama atau barcode"` to the search input in `app/(main)/inventory/page.tsx`.
* Add `aria-sort` with dynamic values (`"ascending" | "descending" | "none" | undefined`) to the table headers in `components/ui/DataTable/DataTable.tsx`.

## 5. Verification Method
1. Run `npm run tsc` to verify TypeScript compilation succeeds with the new attributes.
2. Run `npm run lint` to verify that there are no ESLint violations.
3. Open the web interface, inspect the DOM or check the browser DevTools Accessibility tab:
   * Select the search input and verify its Accessible Name is `"Cari nama atau barcode"`.
   * Click on a sortable column header and verify the `aria-sort` attribute on the corresponding `<th>` element transitions correctly between `"ascending"` and `"descending"`, and that other sortable headers have `aria-sort="none"`.
