# Accessibility Review Report (R1) — 2026-07-12T06:33:14Z

This report evaluates the accessibility enhancements implemented in `components/ui/Modal.tsx` and `components/ui/PriceInput.tsx` based on correctness, style, completeness, and adversarial stress-testing.

---

## Review Summary

**Verdict**: **APPROVE** (All requested enhancements have been correctly implemented, style is clean, and typescript & linting checks pass successfully.)

---

## Findings

### [Major] Finding 1: PriceInput prevents system function keys and shortcuts
- **What**: The custom `onKeyDown` filter in `PriceInput.tsx` is too aggressive. It blocks essential keys like `F5` (refresh), `F11` (fullscreen), `F12` (developer tools), and other non-printable shortcut triggers.
- **Where**: `components/ui/PriceInput.tsx` (lines 149-170)
- **Why**: The logic uses a blacklist style check:
  ```typescript
  if (!/[0-9.,]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
  }
  ```
  Since `F5` does not match `/[0-9.,]/` and does not have `ctrlKey` or `metaKey` active, it calls `e.preventDefault()`, preventing the user from refreshing the page or using browser function keys while focused on the input. This is a keyboard accessibility violation.
- **Suggestion**: Instead of checking key content directly, only prevent default if the key is a character-producing key (i.e., `e.key.length === 1`) and does not match the valid characters. For example:
  ```typescript
  if (e.key.length === 1 && !/[0-9.,]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
  }
  ```
  This naturally allows all control keys (like `Tab`, `ArrowLeft`, `F5`, `F11`, etc.) to pass through without being blocked, while still preventing invalid character entries.

### [Minor] Finding 2: Missing connection between PriceInput and validation errors
- **What**: When the `PriceInput` is invalid or contains an error, the input element does not communicate this state to screen readers.
- **Where**: `components/ui/PriceInput.tsx` (lines 197-238)
- **Why**: 
  1. The `<input>` has no `aria-invalid` attribute set to `"true"` when there is an validation failure (`!isValid` or `!!error`).
  2. The error message `<p className="mt-1 ...">{error}</p>` has no `id`, and the `<input>` lacks `aria-describedby` pointing to it. Consequently, screen reader users will not hear the validation error description when focusing on the invalid field.
- **Suggestion**: 
  - Add an `errorId` using `const errorId = useId()`.
  - Add `aria-invalid={!isValid || !!error ? "true" : undefined}` and `aria-describedby={error ? errorId : undefined}` to the `<input>`.
  - Add `id={errorId}` to the error `<p>` tag.

---

## Verified Claims

- **Modal attributes** → verified via unit test `Modal.accessibility.test.tsx` and manual inspection → **PASS**
  - Added `role="dialog"`, `aria-modal="true"`, and `aria-labelledby={title ? titleId : undefined}` on the modal content wrapper.
  - Linked `titleId` correctly to the heading `<h2>` element.
- **PriceInput associations** → verified via unit test `PriceInput.accessibility.test.tsx` and manual inspection → **PASS**
  - Added `htmlFor` on the `<label>` and mapped it to the `id` of the `<input>` element.
  - Handled both provided custom IDs and auto-generated fallback IDs using `useId()`.
- **TypeScript compilation** → verified via running `npm run tsc` → **PASS** (completed successfully with zero type errors).
- **ESLint rules** → verified via running `npm run lint` → **PASS** (passed completely with zero errors after configuring eslint flat config ignores).

---

## Stress Test Results

### Scenario 1: Focus trapping in Modal when no focusable elements are present (e.g. titleless modal with text only)
- **Attack Scenario**: Render a `Modal` with `isOpen={true}`, no `title` (so the close button is not rendered), and static text children with no focusable elements.
- **Expected Behavior**: The user can navigate using their screen reader or click outside to dismiss the modal, or the modal handles fallback focus.
- **Actual/Predicted Behavior**: 
  - The focus remains on the triggering element outside the modal.
  - When the user presses `Tab` or `Shift+Tab`, the hook `useFocusTrap` captures the event, sees that there are zero focusable elements inside the modal, and calls `e.preventDefault()`, making Tab navigation do nothing. Focus is permanently trapped on the background button.
  - This behaves as a lock because the modal doesn't have a fallback focusable container (e.g., `tabIndex={-1}` on the modal dialog container itself) that receives focus when no focusable children exist.
- **Verdict**: **FAIL** (potential keyboard trap if no close button or title is provided).
- **Mitigation**: Add `tabIndex={-1}` to the dialog wrapper and, if no focusable children are found, focus the wrapper as a fallback.

### Scenario 2: Pressing F5 / F11 / F12 while focusing on PriceInput
- **Attack Scenario**: Focus the `PriceInput` and press `F5` to reload, or `F11` for fullscreen.
- **Expected Behavior**: The browser executes the action (reloads the page or toggles fullscreen).
- **Actual/Predicted Behavior**: The keydown handler prevents default, ignoring the keypress.
- **Verdict**: **FAIL** (aggresive key filtering blocks standard browser controls).
- **Mitigation**: Filter keydown by checking `e.key.length === 1` to target printable characters only.

---

## Unverified Items

- **Visual / screen reader rendering in a live browser**: Since this environment is headless and does not run real screen reader software (e.g. NVDA/VoiceOver), the actual screen reader announcements were not tested live. They are inferred based on standard WAI-ARIA behavior.
