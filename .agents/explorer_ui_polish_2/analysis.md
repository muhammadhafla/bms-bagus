# Analysis - Sidebar Tooltip UI Polish

## Executive Summary
This analysis outlines the strategy for wrapping sidebar navigation links in tooltips when the sidebar is collapsed (icon-only mode) in `app/(main)/layout.tsx`. The proposed solution enhances the existing `Tooltip` component to support side alignment (e.g., `position="right"`) for a cleaner presentation next to the collapsed sidebar.

---

## 1. Problem Analysis

### Target Component
- **File**: `app/(main)/layout.tsx`
- **Sub-component**: `SidebarLink` (lines 76–93)
- **Current Behavior**: Renders only the icon and hides the text label when the sidebar is collapsed. However, there is no tooltip helper to let users know what each icon represents without expanding the sidebar.

### Tooltip Import & Component Availability
- **Import Status**: `Tooltip` is already imported in `app/(main)/layout.tsx` on line 12:
  ```typescript
  import Tooltip from '@/components/ui/Tooltip';
  ```
- **Tooltip Implementation (`components/ui/Tooltip.tsx`)**:
  - The custom tooltip uses absolute positioning to place the bubble on top (`bottom-full left-1/2 -translate-x-1/2 mb-2`).
  - It wraps its children in a `relative inline-block` div.
  - It handles hover/focus state internally.

### Collapse State Condition
- In `app/(main)/layout.tsx`, `SidebarLink` takes a prop called `sidebarCollapsed`.
- The parent wraps links and calls `SidebarLink` passing `sidebarCollapsed={!isSidebarVisible}`:
  - When `autoHideEnabled` is `true` and the sidebar is not hovered, `isSidebarVisible` is `false`, meaning `sidebarCollapsed` is `true`.
  - When collapsed, the text label is hidden via CSS (`lg:hidden` class), leaving only the icon visible.

---

## 2. Proposed Fix Strategy

### Recommendation 1: Extend Tooltip to Support Positions (Highly Recommended)
Since the default tooltip shows at the **top** (`bottom-full`), displaying it above sidebar icons in a vertical list may cause them to overlap or look cluttered. We recommend extending `components/ui/Tooltip.tsx` to support a `position` prop (defaulting to `'top'`) and `className`.

For the sidebar, we can set `position="right"`, which places the tooltip to the right of the icon (using `left-full top-1/2 -translate-y-1/2 ml-2`).

### Recommendation 2: Wrap Links Conditionally in `SidebarLink`
Within `SidebarLink`, check if `sidebarCollapsed` is true. If yes, wrap the `Link` inside the `Tooltip`. If not, render the `Link` directly to avoid unnecessary wrapper divs.

---

## 3. Code Proposals

### A. Enhancing `components/ui/Tooltip.tsx`
Modify `components/ui/Tooltip.tsx` to accept `className` and `position` props.

```tsx
// components/ui/Tooltip.tsx (Proposed changes)
'use client';

import { useState, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export default function Tooltip({ content, children, className = '', position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-neutral-900 dark:border-t-neutral-700',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-neutral-900 dark:border-r-neutral-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-900 dark:border-b-neutral-700',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-neutral-900 dark:border-l-neutral-700',
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`absolute z-50 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in ${positionClasses[position]}`}>
          {content}
          <div className={`absolute border-4 border-transparent ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}
```

### B. Wrapping SidebarLink in `app/(main)/layout.tsx`
Modify `SidebarLink` inside `app/(main)/layout.tsx` to return the link wrapped in `Tooltip` when collapsed:

```tsx
// app/(main)/layout.tsx (Proposed changes)
function SidebarLink({ href, title, icon: Icon, isActive, sidebarCollapsed }: SidebarLinkProps) {
  const linkContent = (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 font-semibold'
          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${sidebarCollapsed ? 'lg:w-3 lg:h-3' : ''}`} />
      <span className={`transition-all ${sidebarCollapsed ? 'lg:hidden' : 'lg:block'}`}>
        {title}
      </span>
    </Link>
  );

  if (sidebarCollapsed) {
    return (
      <Tooltip content={title} position="right" className="w-full">
        {linkContent}
      </Tooltip>
    );
  }

  return linkContent;
}
```

---

## 4. Verification Plan
To verify the proposed changes:
1. **Typecheck**: Run `npm run tsc` to verify there are no compilation or TypeScript errors.
2. **Build**: Run `npm run build` to ensure the Next.js production build completes without issues.
3. **Unit Tests**: Run `npm run test` (or `vitest run`) to confirm existing component tests pass.
4. **Visual Verification**:
   - Start the dev server (`npm run dev`) and log in.
   - Click the collapse toggle button in the sidebar header to enable auto-hide/collapse mode.
   - Unhover the sidebar to let it collapse.
   - Hover over the icons (Dashboard, Analisis, Pengguna) and check if a tooltip with the correct page name appears to the right of each icon.
