# Plan - Accessibility Verification for Modal and PriceInput

## Steps
1. Create `components/ui/Modal.accessibility.test.tsx` using `@testing-library/react`, `@testing-library/jest-dom`, and `vitest`.
   - Test 1: Verify Modal has `role="dialog"`.
   - Test 2: Verify Modal has `aria-modal="true"`.
   - Test 3: Verify Modal has `aria-labelledby` matching the heading `id` when a `title` is provided.
   - Test 4: Verify Modal does not render when `isOpen` is `false`.
2. Create `components/ui/PriceInput.accessibility.test.tsx` using `@testing-library/react`, `@testing-library/jest-dom`, and `vitest`.
   - Test 1: Verify label `htmlFor` matches the input `id` when custom `id` is passed.
   - Test 2: Verify label `htmlFor` matches the input `id` when using auto-generated `id` (without custom `id`).
3. Run the tests using `npm run test:run`.
4. Generate verification report at `c:/project/inventory/.agents/challenger_accessibility_1/challenge.md`.
5. Generate `handoff.md` in `c:/project/inventory/.agents/challenger_accessibility_1`.
6. Send final completion message to the parent agent.
