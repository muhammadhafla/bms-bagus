# Accessibility Investigation Analysis (R1)

## Executive Summary
This report analyzes the required accessibility enhancements for the following files:
1. **`components/ui/Modal.tsx`**: Adding `role="dialog"`, `aria-modal="true"`, and linking the header title using `aria-labelledby` with a unique, server-safe ID.
2. **`components/ui/PriceInput.tsx`**: Connecting the `<label>` and `<input>` using the `htmlFor` attribute and ensuring a unique, fallback ID via React's `useId()`.
3. **`app/layout.tsx`**: Verifying that `userScalable: false` is absent, allowing user pinch-to-zoom for WCAG compliance.

---

## 1. components/ui/Modal.tsx

### Current State
Currently, the modal does not announce itself as a dialog to screen readers and does not link its title element to the modal container.
Lines 46–74 in `components/ui/Modal.tsx`:
```tsx
  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
        <div 
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
        <div ref={focusTrapRef} className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-neutral-950 shadow-xl flex flex-col rounded-2xl max-h-full animate-scale-in`}>
          {title && (
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Tutup"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
```

### Proposed Changes
To enhance accessibility:
1. Import `useId` from `"react"`.
2. Generate a stable, server-safe unique ID for the title header using `useId()`.
3. Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby={title ? titleId : undefined}` to the modal content wrapper.
4. Add the `id={titleId}` attribute to the title `<h2/>` element.

#### Imports Replacement
**Target block (lines 3):**
```tsx
import { useEffect, useCallback } from 'react';
```
**Replacement:**
```tsx
import { useEffect, useCallback, useId } from 'react';
```

#### Modal Function Replacement
**Target block (lines 17–23):**
```tsx
export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);
```
**Replacement:**
```tsx
export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const titleId = useId();

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);
```

#### JSX Structure Replacement
**Target block (lines 54–66):**
```tsx
        <div ref={focusTrapRef} className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-neutral-950 shadow-xl flex flex-col rounded-2xl max-h-full animate-scale-in`}>
          {title && (
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
```
**Replacement:**
```tsx
        <div 
          ref={focusTrapRef} 
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-neutral-950 shadow-xl flex flex-col rounded-2xl max-h-full animate-scale-in`}
        >
          {title && (
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <h2 id={titleId} className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
```

---

## 2. components/ui/PriceInput.tsx

### Current State
The `<label>` element has no connection to the `<input>` element. The input uses the passed `id` prop (which might be undefined).
Lines 181–205 in `components/ui/PriceInput.tsx`:
```tsx
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 text-sm">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          id={id}
          name={name}
          disabled={disabled}
```

### Proposed Changes
To establish the correct label-to-input connection:
1. Import `useId` from `"react"`.
2. Generate a unique fallback ID using `useId()`.
3. Determine the final element ID using `const inputId = id || defaultId`.
4. Apply `htmlFor={inputId}` to the `<label>` and `id={inputId}` to the `<input>`.

#### Imports Replacement
**Target block (line 3):**
```tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
```
**Replacement:**
```tsx
import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
```

#### Component Logic Replacement
**Target block (lines 53–59):**
```tsx
}: PriceInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const lastCaretPosition = useRef<number>(0);
```
**Replacement:**
```tsx
}: PriceInputProps) => {
  const defaultId = useId();
  const inputId = id || defaultId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const lastCaretPosition = useRef<number>(0);
```

#### JSX Label & Input Replacement
**Target block (lines 181–204):**
```tsx
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 text-sm">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          id={id}
```
**Replacement:**
```tsx
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 text-sm">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          id={inputId}
```

---

## 3. app/layout.tsx

### Current State
We inspected the `app/layout.tsx` file to check the `viewport` and `metadata` configurations.
Lines 18–25:
```tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
};
```
No viewport configuration limiting scaling (e.g. `userScalable: false` or `maximumScale: 1`) is present.

### Verification Findings
- The `viewport` object does not set `userScalable: false`.
- The `viewport` object does not set `maximumScale`.
- There are no custom `<meta name="viewport" ...>` tags in the HTML structure (lines 45–67).
- Next.js default behavior for viewport metadata when scale restrictions are omitted is to generate:
  `<meta name="viewport" content="width=device-width, initial-scale=1" />`
  This enables default browser zoom behaviors (pinch-to-zoom), conforming to **WCAG 2.1 AA SC 1.4.4 (Resize Text)**.
- No modifications are required for `app/layout.tsx` as it is already correct.
