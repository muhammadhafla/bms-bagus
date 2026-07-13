# Accessibility Investigation Report (Milestone 1 - R1)

## Summary of Findings
This report details the accessibility (a11y) enhancements required for `components/ui/DateRangePicker.tsx` and `components/ui/ModernPagination.tsx`. The proposed changes add critical ARIA attributes (such as `aria-haspopup`, `aria-expanded`, `role="navigation"`, and `role="group"`) to ensure that screen readers and assistive technologies can properly navigate and interact with these components.

---

## 1. DateRangePicker Accessibility Polish (`components/ui/DateRangePicker.tsx`)

### Current Accessibility Gaps
- **Trigger Button**: Lacks state and relationship mappings. Screen readers do not know that the button opens a popover (`aria-haspopup`) or whether the popover is currently open (`aria-expanded`).
- **Popover Content**: Lacks a semantic role identifying it as a dialog (`role="dialog"`) and a clear label (`aria-label`).
- **Sub-Groups**: The custom inputs and quick presets within the popover are not marked as logical keyboard/screen reader groups, making it harder to navigate them contextually.
- **Close Button**: The mobile close button containing only an `IconX` has no accessible text.

### Proposed Code Changes

#### Chunk 1: Import `useId` for unique accessible control associations
- **File**: `components/ui/DateRangePicker.tsx`
- **Lines**: 3-7

**Before:**
```tsx
import React, { useState, useRef, useEffect } from 'react';
import { IconCalendar, IconX } from '@tabler/icons-react';
import DateInput from './DateInput';
import { Button } from './Button';
```

**After:**
```tsx
import React, { useState, useRef, useEffect, useId } from 'react';
import { IconCalendar, IconX } from '@tabler/icons-react';
import DateInput from './DateInput';
import { Button } from './Button';
```

---

#### Chunk 2: Initialize `useId`
- **File**: `components/ui/DateRangePicker.tsx`
- **Lines**: 16-19

**Before:**
```tsx
export function DateRangePicker({ startDate, endDate, onChange, label, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
```

**After:**
```tsx
export function DateRangePicker({ startDate, endDate, onChange, label, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
```

---

#### Chunk 3: Add ARIA properties to the trigger button
- **File**: `components/ui/DateRangePicker.tsx`
- **Lines**: 100-109

**Before:**
```tsx
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
      >
        <div className="flex items-center gap-2">
          <IconCalendar className="w-4 h-4 text-neutral-500" />
          <span>{displayValue}</span>
        </div>
      </button>
```

**After:**
```tsx
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        className="w-full sm:w-auto flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
      >
        <div className="flex items-center gap-2">
          <IconCalendar className="w-4 h-4 text-neutral-500" />
          <span>{displayValue}</span>
        </div>
      </button>
```

---

#### Chunk 4: Add role, label, and ID to the popover dialog, and add `aria-label` to the close button
- **File**: `components/ui/DateRangePicker.tsx`
- **Lines**: 117-123

**Before:**
```tsx
          {/* Popover / Bottom Sheet */}
          <div className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-auto sm:top-full sm:left-0 sm:mt-2 z-50 bg-white dark:bg-neutral-900 sm:rounded-xl rounded-t-2xl shadow-xl sm:shadow-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 w-full sm:w-[340px] animate-slide-up sm:animate-fade-in-up">
            <div className="flex items-center justify-between sm:hidden mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Pilih Periode</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                <IconX className="w-5 h-5" />
              </button>
            </div>
```

**After:**
```tsx
          {/* Popover / Bottom Sheet */}
          <div 
            id={popoverId}
            role="dialog"
            aria-label={label || 'Pilih rentang tanggal'}
            className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-auto sm:top-full sm:left-0 sm:mt-2 z-50 bg-white dark:bg-neutral-900 sm:rounded-xl rounded-t-2xl shadow-xl sm:shadow-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 w-full sm:w-[340px] animate-slide-up sm:animate-fade-in-up"
          >
            <div className="flex items-center justify-between sm:hidden mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Pilih Periode</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                aria-label="Tutup dialog pilihan tanggal"
                className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-full"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
```

---

#### Chunk 5: Add group roles and labels inside the popover
- **File**: `components/ui/DateRangePicker.tsx`
- **Lines**: 126-157

**Before:**
```tsx
              <div className="grid grid-cols-2 gap-3">
                <DateInput
                  value={startDate}
                  onChange={(v) => onChange(v, endDate)}
                  label="Dari"
                  inputSize="sm"
                />
                <DateInput
                  value={endDate}
                  onChange={(v) => onChange(startDate, v)}
                  label="Sampai"
                  inputSize="sm"
                />
              </div>

              <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full" />

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Preset Cepat</span>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className="px-3 py-2 text-xs font-medium text-center text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
```

**After:**
```tsx
              <div className="grid grid-cols-2 gap-3" role="group" aria-label="Input tanggal kustom">
                <DateInput
                  value={startDate}
                  onChange={(v) => onChange(v, endDate)}
                  label="Dari"
                  inputSize="sm"
                />
                <DateInput
                  value={endDate}
                  onChange={(v) => onChange(startDate, v)}
                  label="Sampai"
                  inputSize="sm"
                />
              </div>

              <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full" />

              <div className="flex flex-col gap-2" role="group" aria-labelledby={`${popoverId}-presets-label`}>
                <span id={`${popoverId}-presets-label`} className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Preset Cepat</span>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className="px-3 py-2 text-xs font-medium text-center text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
```

---

## 2. ModernPagination Accessibility Polish (`components/ui/ModernPagination.tsx`)

### Current Accessibility Gaps
- **Wrapper Tag**: Uses a generic `div` without any semantic role, making it unrecognizable as a navigation component.
- **Missing Navigation Label**: Lacks an `aria-label` to contextualize the pagination container.
- **Button labels on mobile**: The text "Sebelumnya" and "Berikutnya" is hidden on mobile screens, leaving the buttons with only an icon and no accessible name.

### Proposed Code Changes

#### Chunk 1: Modify container wrapper tag to `nav`, and add `role` and `aria-label`
- **File**: `components/ui/ModernPagination.tsx`
- **Lines**: 26-35

**Before:**
```tsx
  return (
    <div className={`flex-shrink-0 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 ${className}`}>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="p-2 sm:px-4 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
      >
        <IconChevronLeft className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-semibold">Sebelumnya</span>
      </button>
```

**After:**
```tsx
  return (
    <nav 
      role="navigation" 
      aria-label="Navigasi paginasi"
      className={`flex-shrink-0 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 ${className}`}
    >
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Halaman sebelumnya"
        className="p-2 sm:px-4 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
      >
        <IconChevronLeft className="w-5 h-5" aria-hidden="true" />
        <span className="hidden sm:inline text-sm font-semibold">Sebelumnya</span>
      </button>
```

---

#### Chunk 2: Add `aria-label` to next button, add `aria-hidden` to icon, and close the `nav` container tag
- **File**: `components/ui/ModernPagination.tsx`
- **Lines**: 50-59

**Before:**
```tsx
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="p-2 sm:px-4 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
      >
        <span className="hidden sm:inline text-sm font-semibold">Berikutnya</span>
        <IconChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
```

**After:**
```tsx
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Halaman berikutnya"
        className="p-2 sm:px-4 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
      >
        <span className="hidden sm:inline text-sm font-semibold">Berikutnya</span>
        <IconChevronRight className="w-5 h-5" aria-hidden="true" />
      </button>
    </nav>
  );
```

---

## 3. Supplementary Recommendations (Bonus Polish)
For a complete accessibility audit, the following enhancement is also recommended:
- **`components/ui/DataTable/Pagination.tsx`**: Update this pagination component to use a `<nav>` tag and add `role="navigation"` and `aria-label="Navigasi paginasi"` to align it with `ModernPagination`.
