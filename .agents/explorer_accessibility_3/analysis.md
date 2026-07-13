# Accessibility Polish Analysis (R1)

This report outlines the required accessibility enhancements in `app/(main)/inventory/page.tsx` and `components/ui/DataTable/DataTable.tsx`.

## Summary
To meet accessibility requirements (R1):
1. **Search Input (`app/(main)/inventory/page.tsx`)**: An `aria-label` attribute needs to be added to provide an accessible name for screen reader compatibility.
2. **Table Header (`components/ui/DataTable/DataTable.tsx`)**: The `aria-sort` attribute needs to be set dynamically on sortable table headers (`<th>`) to communicate the sorting status (ascending, descending, or none) to assistive technologies.

---

## 1. Search Input Accessibility

### Current State
* **File Path**: `app/(main)/inventory/page.tsx`
* **Line Range**: 207-214
* **Observation**: The `<input>` element serves as the search box but lacks a companion `<label>` or an `aria-label`/`aria-labelledby` property. While a `placeholder` exists, it is not a robust accessible name according to WCAG/ARIA guidelines.

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

### Proposed Fix
Add an `aria-label="Cari nama atau barcode"` to provide clear screen-reader feedback matching the placeholder.

**Proposed Replacement Chunk:**
```tsx
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari nama atau barcode"
                aria-label="Cari nama atau barcode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 sm:py-3 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-sm sm:text-base"
              />
```

---

## 2. Table Header Sort State (`aria-sort`)

### Current State
* **File Path**: `components/ui/DataTable/DataTable.tsx`
* **Line Range**: 109-135
* **Observation**: In the desktop view, table headers (`<th>`) display sort indicators, but do not provide semantic representation via `aria-sort`. Screen readers cannot determine the sort state.

```tsx
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400"
                style={{ width: col.width }}
              >
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDirection === 'asc' ? (
                        <IconChevronUp className="w-4 h-4" />
                      ) : (
                        <IconChevronDown className="w-4 h-4" />
                      )
                    ) : (
                      <IconSortAscending className="w-4 h-4 opacity-30" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
```

### Proposed Fix
Introduce a dynamic `aria-sort` attribute on the `<th>` tag:
* If the column is sortable and matches `sortKey`, set it to `"ascending"` or `"descending"` based on `sortDirection`.
* If the column is sortable but not current, set it to `"none"`.
* If the column is not sortable, leave it `undefined`.

**Proposed Replacement Chunk:**
```tsx
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400"
                style={{ width: col.width }}
                aria-sort={
                  col.sortable
                    ? sortKey === col.key
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                    : undefined
                }
              >
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDirection === 'asc' ? (
                        <IconChevronUp className="w-4 h-4" />
                      ) : (
                        <IconChevronDown className="w-4 h-4" />
                      )
                    ) : (
                      <IconSortAscending className="w-4 h-4 opacity-30" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
```
