# PRD: Remove React Router — Next.js App Router Compatibility

## Problem Statement

The `boundless-checkout-react-cp` package is a modal-based checkout component library that internally creates its own `BrowserRouter` context using React Router v7. When this library is consumed by a Next.js 16 application using the App Router, two competing routing contexts exist simultaneously: Next.js owns the application URL and history, while React Router creates a parallel router inside the modal.

This causes the following problems:
- The Next.js router and React Router fight for control of the browser's history stack
- Checkout step URLs (e.g. `/info`, `/payment`) bleed into the host application's address bar during checkout, confusing users and breaking back-button behavior
- `BrowserRouter` is incompatible with the React Server Component model used by Next.js App Router
- Consumers cannot safely use the component in a Next.js App Router project without routing conflicts

## Solution

Remove React Router from the package entirely. Replace URL-based step navigation with internal Redux state. Each checkout step becomes a conditionally rendered component driven by a `currentStep` value in the Redux store. The host application retains full ownership of the browser URL; the checkout modal manages its own progression internally with no URL side effects.

## User Stories

1. As a Next.js App Router developer, I want to embed the `BoundlessCheckout` component in my application without React Router conflicts, so that my application's routing continues to work correctly during checkout.
2. As a Next.js App Router developer, I want the checkout modal to not modify the browser's address bar, so that users are not confused by URL changes during checkout.
3. As a Next.js App Router developer, I want the browser back button to navigate within my application (not within the checkout steps), so that the user experience is predictable and standard.
4. As a Next.js App Router developer, I want to install the package without pulling in `react-router` as a transitive dependency, so that my dependency tree is clean and there are no version conflicts.
5. As a consumer of the library, I want checkout step transitions to remain seamless and animated, so that removing the router does not degrade the user-facing experience.
6. As a consumer of the library, I want the checkout progress indicator to correctly highlight the active step, so that users always know where they are in the checkout flow.
7. As a consumer of the library, I want navigation guards (e.g. preventing access to the payment step before contact info is filled) to continue to work correctly, so that users cannot skip required steps.
8. As a consumer of the library, I want the `onThankYouPage` callback to fire correctly after checkout completes, so that my application can respond to a successful purchase.
9. As a consumer of the library, I want the `onHide` callback to fire correctly when the modal is closed, so that my application can update its own state appropriately.
10. As a consumer of the library, I want the checkout to resume at the correct step if the modal is closed and reopened mid-flow, so that users do not lose their progress.
11. As a library maintainer, I want the `basename` prop removed from the public API, so that the API surface reflects the component's actual capabilities.
12. As a library maintainer, I want all routing-specific utilities (`routes.ts`, `getPathByStep`, `getStepByPath`) removed, so that there is no dead code or misleading abstractions in the codebase.
13. As a library maintainer, I want `IndexPage` and `ErrorPage` removed, so that the page component set maps exactly to the real checkout steps with no routing-specific scaffolding.
14. As a library maintainer, I want the existing Jest test suite to be updated to remove all React Router mocks, so that tests reflect the real component architecture.
15. As a library maintainer, I want a test for the new step renderer component, so that step transitions and guard behavior are covered by automated tests.

## Implementation Decisions

### Modules to Build or Modify

**1. Redux `app` slice — step transition actions**
- Add a `setCurrentStep(step: TCheckoutStep)` action (or confirm it already exists)
- This action becomes the single mechanism for all step transitions
- Deep module: encapsulates all step state; simple dispatch interface; independently testable

**2. Step Renderer component (replaces `App.tsx` + `IndexPage`)**
- New component that reads `currentStep` from Redux and renders the corresponding page component
- Contains a `switch` or component map over `TCheckoutStep` values
- On mount, runs the initialization logic currently in `IndexPage` (triggers `useInitCheckoutByCart` or equivalent)
- Falls back to `ContactInfoPage` (or renders nothing) for unexpected step values
- Replaces `App.tsx` entirely; `IndexPage` is deleted

**3. `BoundlessCheckout` component**
- Remove `BrowserRouter` import and wrapping
- Remove `basename` prop from `IBoundlessCheckoutProps` interface and all internal usage
- Replace `App` with the new Step Renderer in the component tree

**4. `CheckoutProgress` component**
- Remove `useLocation()` and `useNavigate()` imports
- Read `currentStep` directly from Redux via `useAppSelector`
- On step click, dispatch `setCurrentStep(step)` instead of calling `navigate(url)`
- Delete dependency on `getPathByStep` and `getStepByPath`

**5. Page-level navigation guards (`ShippingPage`, `PaymentPage`)**
- Replace all `navigate(path)` calls with `dispatch(setCurrentStep(TCheckoutStep.contactInfo))` (or appropriate target step)
- Guard logic (checking `filledSteps`, `isInited`) remains unchanged

**6. Form submission navigation (`ContactInformationForm`, `ShippingForm`)**
- Replace `navigate(nextUrl)` calls with `dispatch(setCurrentStep(nextStep))`
- Step determination logic (based on `stepper.steps` availability) remains unchanged

**7. `routes.ts` — deleted**
- `getPathByStep`, `getStepByPath`, and the step-to-path map are removed entirely
- No replacement needed; step identity is now `TCheckoutStep` enum values, not URL strings

**8. `IndexPage` — deleted**
- Initialization logic migrated to Step Renderer

**9. `ErrorPage` — deleted**
- No replacement; Step Renderer handles unknown step values with a safe fallback

**10. `package.json`**
- Remove `react-router` from `dependencies`
- Verify no other `react-router` entry exists in `peerDependencies` or `devDependencies`

### Architectural Decisions

- **No new routing library introduced.** The refactor moves from URL-based routing to pure Redux state. No alternative router (e.g. `wouter`, Next.js router) is adopted as a replacement.
- **`TCheckoutStep` enum remains the canonical step identifier.** All navigation is expressed in terms of enum values, not strings or indices.
- **Step state ownership stays in Redux.** The `stepper` slice continues to be the source of truth for `currentStep` and `filledSteps`. No React `useState` is introduced for step management.
- **Public API surface change: `basename` prop removed.** This is a breaking change; the next release should be a major version bump.
- **Initialization boundary moves to Step Renderer.** The `IndexPage`'s role as an initialization gate is absorbed by the Step Renderer, which checks `isInited` before rendering a step and triggers initialization on mount if needed.

## Testing Decisions

**What makes a good test here:**
- Test observable behavior (which step is rendered, which Redux action is dispatched) not implementation details (which hooks are called internally)
- Do not assert on React Router internals — after this refactor, there are none
- Use the existing pattern from `BoundlessCheckout.test.tsx`: mock external dependencies (Redux store, scroll lock), render the component, assert on dispatched action types and rendered output

**Modules to test:**

1. **Step Renderer component**
   - Given a `currentStep` value in Redux, assert that the correct page component is rendered
   - Assert that initialization logic fires on mount when `isInited` is false
   - Assert that an unknown step value does not crash the component

2. **`CheckoutProgress` component**
   - Given a `currentStep` in Redux, assert that the correct step is marked active in the UI
   - Assert that clicking a step button dispatches `setCurrentStep` with the correct step value

3. **`BoundlessCheckout` component (update existing tests)**
   - Remove all `BrowserRouter` mocks from `BoundlessCheckout.test.tsx`
   - Assert that `basename` is no longer an accepted prop (TypeScript compile-time check is sufficient)
   - Retain all existing tests for portal creation, scroll lock, and Redux dispatch behavior

**Prior art:** `src/__tests__/BoundlessCheckout.test.tsx` — demonstrates the mock-store + render + assert-dispatched-actions pattern to follow.

## Out of Scope

- Replacing React Router with an alternative routing library (e.g. `wouter`, Next.js App Router's own `useRouter`)
- Adding URL-based deep linking to individual checkout steps as an opt-in feature
- Migrating the checkout steps themselves to Next.js page or layout components
- Changes to the `BoundlessOrderInfo` component or `startOrderInfo` flow
- Removing the deprecated `startCheckout`, `startOrderInfo`, or `StarterWrapper` exports (separate concern)
- Any visual or UX changes to the checkout flow
- Performance optimizations or unrelated refactors

## Further Notes

- The `basename` prop removal is a **breaking change**. The version bump from `5.0.0` should go to `6.0.0`.
- The `FIXME` comments in `routes.ts` (for `shippingMethod` and `thankYou` steps mapping to `/`) are eliminated by this refactor, as the file is deleted entirely.
- After this refactor, the package has zero runtime dependency on any router. Consumers using React Router in their own apps are unaffected — the two routers no longer conflict because this package no longer brings one.
- The `BrowserRouter` mock in the existing test suite (`jest.mock('react-router', ...)`) should be removed entirely. If any test relied on that mock to prevent routing errors, the underlying cause (routing inside a test environment) will be gone.
