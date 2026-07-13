# Handoff Report - Sidebar Link Tooltips

## 1. Observation
- **Import of Tooltip**: In `app/(main)/layout.tsx` at line 12:
  ```typescript
  import Tooltip from '@/components/ui/Tooltip';
  ```
  This import is verified to exist, but grep search shows no other occurrences of `Tooltip` in `layout.tsx` besides the import.
- **SidebarLink definition**: In `app/(main)/layout.tsx` starting at line 76:
  ```typescript
  function SidebarLink({ href, title, icon: Icon, isActive, sidebarCollapsed }: SidebarLinkProps) {
    return (
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
  }
  ```
- **Tooltip Implementation**: In `components/ui/Tooltip.tsx` at lines 10-29:
  ```typescript
  export default function Tooltip({ content, children }: TooltipProps) {
    const [show, setShow] = useState(false);

    return (
      <div 
        className="relative inline-block"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >
        {children}
        {show && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-700" />
          </div>
        )}
      </div>
    );
  }
  ```
  It has no customization for positioning, meaning it is hardcoded to appear at the top.

---

## 2. Logic Chain
1. To show a tooltip when the sidebar is collapsed (icon-only mode), we must check the condition of collapse in `SidebarLink`.
2. The `SidebarLink` receives the `sidebarCollapsed` prop (which represents when the sidebar is in icon-only mode).
3. If we wrap the `Link` inside the `Tooltip` component inside `SidebarLink` when `sidebarCollapsed` is true, a tooltip will render upon hover.
4. However, because the existing `Tooltip` component is hardcoded to show at the top (`bottom-full`), rendering tooltips above vertical list items will overlap adjacent elements.
5. Therefore, we should extend `Tooltip` to accept a `position` prop (defaulting to `'top'`) and use `position="right"` in `SidebarLink` to align the tooltip on the right side of the collapsed sidebar.
6. This strategy is fully backwards compatible and fulfills the requirement cleanly.

---

## 3. Caveats
- No caveats identified. The design is straightforward and builds upon existing components.

---

## 4. Conclusion
We recommend implementing the fix by:
1. Extending `components/ui/Tooltip.tsx` to support a `position` prop (`'top' | 'right' | 'bottom' | 'left'`) and a `className` prop.
2. Updating `SidebarLink` in `app/(main)/layout.tsx` to conditionally wrap the `Link` in `<Tooltip content={title} position="right" className="w-full">` when `sidebarCollapsed` is true.
The changes are written to `.agents/explorer_ui_polish_2/proposed_changes.patch`.

---

## 5. Verification Method
1. Run typecheck to verify typescript compatibility:
   ```bash
   npm run tsc
   ```
2. Run build to verify next.js bundle compiles correctly:
   ```bash
   npm run build
   ```
3. Run tests to ensure no regressions:
   ```bash
   npm run test
   ```
4. Start dev server and manually verify that:
   - When the sidebar is collapsed, hovering on the icons displays a right-aligned tooltip containing the page name.
   - When the sidebar is expanded, no tooltip is shown.
