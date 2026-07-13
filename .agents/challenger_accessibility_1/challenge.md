# Accessibility Verification Report: Modal & PriceInput

## Challenge Summary

**Overall risk assessment**: LOW

All target accessibility requirements for `Modal` and `PriceInput` components have been successfully verified programmatically with dedicated unit/integration tests:
1. **Modal**: Successfully verified that it has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` correctly matching the title/heading element ID (when a title is provided).
2. **PriceInput**: Successfully verified that the label's `for` attribute matches the input's `id` under both scenarios (when custom `id` is passed and when the ID is auto-generated via React's `useId`).

---

## Challenges & Observations

### [Medium] Challenge 1: Unlabeled Input Risk in PriceInput

- **Assumption challenged**: The developer will always provide a `label` prop to `PriceInput`.
- **Attack scenario**: If `label` is omitted, the `PriceInput` component does not render any `<label>` element. Furthermore, because the component does not spread extra HTML attributes or ARIA attributes to the underlying `<input>` element (i.e. it only picks specific props and does not support `aria-label` or `aria-labelledby`), there is no way to make the input accessible to screen readers when `label` is not specified.
- **Blast radius**: Screen reader users will hear an unlabeled textbox ("numeric text edit") without knowing what the input represents (e.g. they won't know if it's for purchasing price, selling price, tax, etc.).
- **Mitigation**: Update the `PriceInputProps` and destructure remaining properties using the rest pattern `...props`, then spread `...props` to the `<input>` element. This will allow standard attributes like `aria-label`, `aria-labelledby`, or `title` to be passed down.

### [Low] Challenge 2: Keyboard Trap in Title-less Modal

- **Assumption challenged**: Modals will always contain focusable children, or will always have a title (and thus a close button).
- **Attack scenario**: If a modal is rendered without a `title` prop, the top bar containing the close button (with `aria-label="Tutup"`) is not rendered. If the developer also renders children without any focusable element, keyboard users and screen readers will have no focusable elements inside the modal. The focus trap hook will lock focus to the document/modal body, but the user cannot tab to any button to close it.
- **Blast radius**: Keyboard-only users might get trapped or have difficulty closing the modal, having to rely on the ESC key (which is supported but not discoverable to all screen reader/keyboard users).
- **Mitigation**: Render an invisible/screen-reader-only close button if no header/title close button is visible, or enforce that a close action is always focusable/accessible.

---

## Stress Test Results

The following test suite was constructed and run:

- **Modal Accessibility Suite** (`components/ui/Modal.accessibility.test.tsx`):
  - *Scenario*: Render Modal with `isOpen={false}`.
    - *Expected behavior*: Does not render dialog.
    - *Actual behavior*: Returns null, dialog is not in document.
    - *Result*: **PASS**
  - *Scenario*: Render Modal with `isOpen={true}` and a `title`.
    - *Expected behavior*: Dialog role present, `aria-modal="true"` present, and `aria-labelledby` matches the heading's ID.
    - *Actual behavior*: All attributes present and matched correctly.
    - *Result*: **PASS**
  - *Scenario*: Render Modal with `isOpen={true}` and no `title`.
    - *Expected behavior*: Dialog role present, `aria-modal="true"` present, but `aria-labelledby` not set.
    - *Actual behavior*: Dialog present without `aria-labelledby` attribute.
    - *Result*: **PASS**
  - *Scenario*: Keyboard interaction - press `Escape` key inside open Modal.
    - *Expected behavior*: Triggers `onClose` callback once.
    - *Actual behavior*: Callback triggered once.
    - *Result*: **PASS**
  - *Scenario*: Interaction - click the backdrop element.
    - *Expected behavior*: Triggers `onClose` callback once.
    - *Actual behavior*: Callback triggered once.
    - *Result*: **PASS**

- **PriceInput Accessibility Suite** (`components/ui/PriceInput.accessibility.test.tsx`):
  - *Scenario*: Render PriceInput with custom `id` and `label`.
    - *Expected behavior*: Label's `for` attribute matches the custom ID, and input's `id` matches the custom ID.
    - *Actual behavior*: Attributes match `custom-price-input-id`.
    - *Result*: **PASS**
  - *Scenario*: Render PriceInput with `label` but no custom `id`.
    - *Expected behavior*: Label's `for` attribute matches the auto-generated input ID.
    - *Actual behavior*: Attributes match auto-generated React `useId` string.
    - *Result*: **PASS**

---

## Unchallenged Areas

- **Focus trapping behavior with nested elements**: Not fully mocked/simulated in jsdom as focus trap depends heavily on visual visibility and full browser focus cycle behavior, which is only partially simulated in jsdom.
- **Other components**: Components other than `Modal` and `PriceInput` were out of scope for verification, though some existing failing tests in the test suite were observed (e.g. `lib/store.test.ts`, `components/ui/DataTable.accessibility.test.tsx`, `components/ui/SearchInput.accessibility.test.tsx`). These pre-existing failures are documented below.

---

## Additional Observations (Pre-existing Failures)

During test execution, several pre-existing test failures were observed in the project:
1. `lib/store.test.ts`:
   - `usePembelianStore > addItem > should add as new item for different diskon`: Fails because store item length is 1 instead of 2.
   - `usePembelianStore > updateHargaBeli > should update harga_beli and recalculate harga_final`: Fails because `harga_final` received 60000 instead of 50000.
2. `components/ui/DataTable.accessibility.test.tsx`:
   - `renders table headers with correct aria-sort values...`: Fails due to a test timeout (5000ms).
3. `components/ui/SearchInput.accessibility.test.tsx`:
   - `correctly associates input with label for screen readers`: Fails with `htmlFor` / `for` mismatch where the test asserts `toHaveAttribute('for', ...)` but the element doesn't have it (or the assertion style is incorrect).
