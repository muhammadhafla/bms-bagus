# Worker Task: Implement Milestone 2 (UI Polish)

## Instructions
Please implement the following UI Polish and layout changes in the codebase:

### 1. Toast Component Close Button Icon
- **File**: `components/ui/Toast.tsx`
- Add import: `import { IconX } from '@tabler/icons-react';` at the top of the file.
- Replace the raw close button text character `'×'` with `<IconX className="w-4 h-4" />`.

### 2. Confirm Dialog Focus Conflict Resolution
- **File**: `components/ui/ConfirmDialog.tsx`
- In the `useEffect` hook that handles the Esc key and opens/focuses, remove the statement `dialogRef.current?.focus();` (around line 40).
- This avoids focus-conflict with the native `autoFocus` property on the Confirm button.

### 3. Extend Tooltip Component with Position Prop
- **File**: `components/ui/Tooltip.tsx`
- Modify `TooltipProps` and `Tooltip` to accept:
  - `position?: 'top' | 'right' | 'bottom' | 'left'` (defaulting to `'top'`)
  - `className?: string` (to allow styling the outer container)
- Dynamically apply tailwind classes for the tooltip panel and arrow based on the selected `position`:
  - `'top'`:
    - Panel: `bottom-full left-1/2 -translate-x-1/2 mb-2`
    - Arrow: `top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-700`
  - `'right'`:
    - Panel: `left-full top-1/2 -translate-y-1/2 ml-2`
    - Arrow: `right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-neutral-700`
  - `'bottom'`:
    - Panel: `top-full left-1/2 -translate-x-1/2 mt-2`
    - Arrow: `bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900 dark:border-b-neutral-700`
  - `'left'`:
    - Panel: `right-full top-1/2 -translate-y-1/2 mr-2`
    - Arrow: `left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-neutral-900 dark:border-l-neutral-700`
- Cleanly combine the `className` prop if provided on the wrapper `div`.

### 4. Collapsed Sidebar Tooltips & Mobile Menu Toggle z-index
- **File**: `app/(main)/layout.tsx`
- In `SidebarLink`, wrap the `Link` component in `<Tooltip content={title} position="right">` when `sidebarCollapsed` is true. Ensure that when `sidebarCollapsed` is false, it returns the link normally without tooltip wrapping (or wraps but doesn't trigger, wrapping conditionally is cleanest).
- For the mobile menu toggle button (around line 255), modify its classes in `className` to change `z-30` to `z-40`.

---

## Verification Requirements
You MUST verify your work before handoff:
1. Run `npm run tsc` to verify TypeScript type checking passes.
2. Run `npm run lint` to verify that there are no eslint errors or warnings on the modified files.
3. Run `npm run test:run` (or the appropriate test script) and document the results. The only failures should be the two pre-existing ones in `lib/store.test.ts`.
4. Run `npm run build` to verify next.js compiles successfully.

---

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
