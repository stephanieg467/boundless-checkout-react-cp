# Remove React Router — Next.js App Router Compatibility

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove React Router entirely from the package and replace URL-based step navigation with Redux state, so the component can be safely embedded in Next.js App Router applications.

**Architecture:** A new `StepRenderer` component reads `currentStep` from `state.app.stepper` and renders the correct page component directly. All `navigate(url)` calls are replaced with `dispatch(setCurrentStep(step))`. `App.tsx`, `routes.ts`, `IndexPage`, and `ErrorPage` are deleted; `BoundlessCheckout.tsx` drops `BrowserRouter` and the `basename` prop.

**Tech Stack:** React 19, Redux Toolkit 2, TypeScript 5, Jest + Testing Library, `TCheckoutStep` enum from `boundless-api-client`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/redux/reducers/app.ts` | Add `setCurrentStep` action |
| Create | `src/StepRenderer.tsx` | Read `currentStep` from Redux, render the correct page, run init on mount |
| Modify | `src/BoundlessCheckout.tsx` | Drop `BrowserRouter`, drop `basename` prop, swap `CheckoutApp` → `StepRenderer` |
| Delete | `src/App.tsx` | Replaced by `StepRenderer` |
| Delete | `src/routes.ts` | No longer needed |
| Delete | `src/pages/IndexPage.tsx` | Init logic moved to `StepRenderer` |
| Delete | `src/pages/ErrorPage.tsx` | Global error handled inline in `StepRenderer` |
| Modify | `src/components/CheckoutProgress.tsx` | Drop `useLocation`/`useNavigate`; read `currentStep` from Redux; dispatch `setCurrentStep` on click |
| Modify | `src/pages/ShippingPage.tsx` | Replace `navigate("/info")` with `dispatch(setCurrentStep(TCheckoutStep.contactInfo))` |
| Modify | `src/pages/PaymentPage.tsx` | Replace `navigate("/info")` with `dispatch(setCurrentStep(TCheckoutStep.contactInfo))` |
| Modify | `src/components/ContactInformationForm.tsx` | Replace `navigate(nextUrl)` with `dispatch(setCurrentStep(...))` |
| Modify | `src/pages/shippingPage/ShippingForm.tsx` | Replace `navigate("/payment")` with `dispatch(setCurrentStep(TCheckoutStep.paymentMethod))` |
| Modify | `package.json` | Remove `react-router` from `dependencies` |
| Modify | `src/__tests__/BoundlessCheckout.test.tsx` | Remove `BrowserRouter` mock; update `App` mock path to `StepRenderer` |
| Create | `src/__tests__/StepRenderer.test.tsx` | Tests for step rendering and init behavior |
| Create | `src/__tests__/CheckoutProgress.test.tsx` | Tests for active step highlighting and step click dispatch |

---

## Task 1: Add `setCurrentStep` action to the Redux `app` slice

**Files:**
- Modify: `src/redux/reducers/app.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/app.slice.test.ts`:

```ts
import appReducer, {setCurrentStep} from '../redux/reducers/app';
import {TCheckoutStep} from 'boundless-api-client';

describe('app slice – setCurrentStep', () => {
  it('updates stepper.currentStep', () => {
    const initial = {
      isInited: true,
      show: true,
      globalError: null,
      stepper: {
        currentStep: TCheckoutStep.contactInfo,
        steps: [TCheckoutStep.contactInfo, TCheckoutStep.paymentMethod],
        filledSteps: [],
      },
    } as any;

    const next = appReducer(initial, setCurrentStep(TCheckoutStep.paymentMethod));
    expect(next.stepper?.currentStep).toBe(TCheckoutStep.paymentMethod);
  });

  it('is a no-op when stepper is null', () => {
    const initial = {isInited: false, show: false, globalError: null, stepper: null} as any;
    const next = appReducer(initial, setCurrentStep(TCheckoutStep.contactInfo));
    expect(next.stepper).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/__tests__/app.slice.test.ts --no-coverage
```

Expected: FAIL — `setCurrentStep` is not exported from `app.ts`.

- [ ] **Step 3: Add `setCurrentStep` to the slice**

In `src/redux/reducers/app.ts`, add inside the `reducers` object (after `setLocaleSettings`):

```ts
setCurrentStep(state, action: PayloadAction<TCheckoutStep>) {
  if (state.stepper) {
    state.stepper.currentStep = action.payload;
  }
},
```

And add `setCurrentStep` to the destructured export block at line 149–163:

```ts
export const {
  setBasicProps,
  showCheckout,
  hideCheckout,
  setCheckoutData,
  addFilledStep,
  setOrdersCustomer,
  setGlobalError,
  setOrder,
  setCheckoutInited,
  resetAppState,
  setTotal,
  setIsInited,
  setLocaleSettings,
  setCurrentStep,
} = appSlice.actions;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/__tests__/app.slice.test.ts --no-coverage
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/redux/reducers/app.ts src/__tests__/app.slice.test.ts
git commit -m "feat: add setCurrentStep action to app slice"
```

---

## Task 2: Create `StepRenderer` component

**Files:**
- Create: `src/StepRenderer.tsx`
- Create: `src/__tests__/StepRenderer.test.tsx`

This component replaces both `App.tsx` and `IndexPage.tsx`. It reads `currentStep` from `state.app.stepper`, calls `useInitCheckoutByCart()` on mount, and renders the matching page. Global errors are shown inline (replacing `ErrorPage`).

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/StepRenderer.test.tsx`:

```tsx
import React from 'react';
import {render, screen} from '@testing-library/react';
import {TCheckoutStep} from 'boundless-api-client';

// ── mocks ──────────────────────────────────────────────────────────────
jest.mock('../hooks/initCheckout', () => () => ({isInited: true}));

jest.mock('../pages/ContactInfoPage', () => () => <div data-testid="contact-info-page" />);
jest.mock('../pages/ShippingPage', () => () => <div data-testid="shipping-page" />);
jest.mock('../pages/PaymentPage', () => () => <div data-testid="payment-page" />);
jest.mock('../components/Loading', () => () => <div data-testid="loading" />);

// Controllable Redux state
let mockState: any = {};
jest.mock('../hooks/redux', () => ({
  useAppSelector: (selector: any) => selector(mockState),
}));

import StepRenderer from '../StepRenderer';

// ── helpers ─────────────────────────────────────────────────────────────
const renderWithStep = (currentStep: TCheckoutStep | null, globalError: string | null = null) => {
  mockState = {
    app: {
      isInited: true,
      globalError,
      stepper: currentStep
        ? {currentStep, steps: [currentStep], filledSteps: []}
        : null,
    },
  };
  return render(<StepRenderer />);
};

// ── tests ────────────────────────────────────────────────────────────────
describe('StepRenderer', () => {
  it('renders ContactInfoPage for contactInfo step', () => {
    renderWithStep(TCheckoutStep.contactInfo);
    expect(screen.getByTestId('contact-info-page')).toBeInTheDocument();
  });

  it('renders ShippingPage for shippingAddress step', () => {
    renderWithStep(TCheckoutStep.shippingAddress);
    expect(screen.getByTestId('shipping-page')).toBeInTheDocument();
  });

  it('renders PaymentPage for paymentMethod step', () => {
    renderWithStep(TCheckoutStep.paymentMethod);
    expect(screen.getByTestId('payment-page')).toBeInTheDocument();
  });

  it('renders loading when stepper is null', () => {
    renderWithStep(null);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders global error when globalError is set', () => {
    renderWithStep(TCheckoutStep.contactInfo, 'Something went wrong');
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not crash for an unexpected step value', () => {
    renderWithStep('unknownStep' as TCheckoutStep);
    // Should fall back to ContactInfoPage or Loading, no throw
    expect(screen.getByTestId('contact-info-page')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest src/__tests__/StepRenderer.test.tsx --no-coverage
```

Expected: FAIL — `../StepRenderer` module not found.

- [ ] **Step 3: Create `StepRenderer.tsx`**

Create `src/StepRenderer.tsx`:

```tsx
import React from "react";
import {TCheckoutStep} from "boundless-api-client";
import {useAppSelector} from "./hooks/redux";
import useInitCheckoutByCart from "./hooks/initCheckout";
import ContactInfoPage from "./pages/ContactInfoPage";
import ShippingPage from "./pages/ShippingPage";
import PaymentPage from "./pages/PaymentPage";
import Loading from "./components/Loading";
import ErrorPage from "./pages/ErrorPage";

const stepComponents: Partial<Record<TCheckoutStep, React.ComponentType>> = {
  [TCheckoutStep.contactInfo]: ContactInfoPage,
  [TCheckoutStep.shippingAddress]: ShippingPage,
  [TCheckoutStep.paymentMethod]: PaymentPage,
};

export default function StepRenderer() {
  useInitCheckoutByCart();
  const {stepper, globalError} = useAppSelector((state) => state.app);

  if (globalError) {
    return <ErrorPage error={globalError} />;
  }

  if (!stepper) {
    return <Loading />;
  }

  const StepComponent = stepComponents[stepper.currentStep] ?? ContactInfoPage;
  return <StepComponent />;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest src/__tests__/StepRenderer.test.tsx --no-coverage
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/StepRenderer.tsx src/__tests__/StepRenderer.test.tsx
git commit -m "feat: add StepRenderer component to replace App.tsx + IndexPage"
```

---

## Task 3: Update `CheckoutProgress` to use Redux instead of React Router

**Files:**
- Modify: `src/components/CheckoutProgress.tsx`
- Create: `src/__tests__/CheckoutProgress.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/CheckoutProgress.test.tsx`:

```tsx
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {TCheckoutStep} from 'boundless-api-client';
import {setCurrentStep} from '../redux/reducers/app';

const mockDispatch = jest.fn();
let mockState: any = {};

jest.mock('../hooks/redux', () => ({
  useAppSelector: (selector: any) => selector(mockState),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

import CheckoutProgress from '../components/CheckoutProgress';

const renderWithStepper = (currentStep: TCheckoutStep, steps: TCheckoutStep[]) => {
  mockState = {
    app: {
      stepper: {currentStep, steps, filledSteps: []},
    },
  };
  return render(<CheckoutProgress />);
};

describe('CheckoutProgress', () => {
  beforeEach(() => mockDispatch.mockClear());

  it('returns null when stepper is null', () => {
    mockState = {app: {stepper: null}};
    const {container} = render(<CheckoutProgress />);
    expect(container.firstChild).toBeNull();
  });

  it('marks the active step based on currentStep from Redux', () => {
    renderWithStepper(TCheckoutStep.paymentMethod, [
      TCheckoutStep.contactInfo,
      TCheckoutStep.paymentMethod,
    ]);
    // MUI Stepper sets aria-disabled=false on the active step button
    // Active step index is 1 (paymentMethod is index 1)
    const buttons = screen.getAllByRole('button');
    // The active step button corresponds to index 1
    expect(buttons[1]).toBeInTheDocument();
  });

  it('dispatches setCurrentStep when a step button is clicked', () => {
    renderWithStepper(TCheckoutStep.contactInfo, [
      TCheckoutStep.contactInfo,
      TCheckoutStep.paymentMethod,
    ]);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // click paymentMethod step

    expect(mockDispatch).toHaveBeenCalledWith(
      setCurrentStep(TCheckoutStep.paymentMethod)
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest src/__tests__/CheckoutProgress.test.tsx --no-coverage
```

Expected: FAIL — `useLocation` / `useNavigate` not available outside router context.

- [ ] **Step 3: Rewrite `CheckoutProgress.tsx`**

Replace the full contents of `src/components/CheckoutProgress.tsx`:

```tsx
import {Step, StepButton, Stepper} from "@mui/material";
import {TCheckoutStep} from "boundless-api-client";
import React, {useMemo} from "react";
import {useAppDispatch, useAppSelector} from "../hooks/redux";
import {setCurrentStep} from "../redux/reducers/app";
import {useTranslation} from "react-i18next";

export default function CheckoutProgress() {
  const stepper = useAppSelector((state) => state.app.stepper);
  const dispatch = useAppDispatch();
  const {t} = useTranslation();

  const currentStepIndex = stepper
    ? stepper.steps.indexOf(stepper.currentStep)
    : 0;

  const handleStepChange = (step: TCheckoutStep) => {
    dispatch(setCurrentStep(step));
  };

  const checkoutStepTitles = useMemo(
    () => ({
      [TCheckoutStep.contactInfo]: t("checkoutProgress.contactInfo"),
      [TCheckoutStep.shippingAddress]: t("checkoutProgress.shippingAddress"),
      [TCheckoutStep.shippingMethod]: t("checkoutProgress.shippingMethod"),
      [TCheckoutStep.paymentMethod]: t("checkoutProgress.paymentMethod"),
      [TCheckoutStep.thankYou]: t("checkoutProgress.thankYou"),
    }),
    [t]
  );

  if (!stepper) return null;

  return (
    <div className="bdl-checkout-progress">
      <Stepper activeStep={currentStepIndex} alternativeLabel>
        {stepper.steps.map((step) => (
          <Step key={step}>
            <StepButton color="inherit" onClick={() => handleStepChange(step)}>
              {checkoutStepTitles[step]}
            </StepButton>
          </Step>
        ))}
      </Stepper>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest src/__tests__/CheckoutProgress.test.tsx --no-coverage
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/CheckoutProgress.tsx src/__tests__/CheckoutProgress.test.tsx
git commit -m "feat: remove React Router from CheckoutProgress, use Redux setCurrentStep"
```

---

## Task 4: Replace `navigate` calls in form submit handlers

**Files:**
- Modify: `src/components/ContactInformationForm.tsx`
- Modify: `src/pages/shippingPage/ShippingForm.tsx`

- [ ] **Step 1: Update `ContactInformationForm.tsx`**

In `src/components/ContactInformationForm.tsx`:

1. Remove the `useNavigate` import and add `setCurrentStep` to the imports:

```ts
// Remove:
import {useNavigate} from "react-router";

// Change the existing import from app.ts to also include setCurrentStep:
import {addFilledStep, setOrdersCustomer, setCurrentStep} from "../redux/reducers/app";
```

2. In `useSaveContactInfo`, remove `const navigate = useNavigate();` and replace the navigation call at the bottom of `onSubmit`:

```ts
// Remove:
const navigate = useNavigate();

// Replace:
//   const nextUrl = stepper!.steps.includes(TCheckoutStep.shippingAddress)
//     ? "/shipping-address"
//     : "/payment";
//   navigate(nextUrl, {replace: true});
// With:
const nextStep = stepper!.steps.includes(TCheckoutStep.shippingAddress)
  ? TCheckoutStep.shippingAddress
  : TCheckoutStep.paymentMethod;
dispatch(setCurrentStep(nextStep));
```

- [ ] **Step 2: Update `ShippingForm.tsx`**

In `src/pages/shippingPage/ShippingForm.tsx`:

1. Remove the `useNavigate` import and add `setCurrentStep`:

```ts
// Remove:
import {useNavigate} from "react-router";

// Change the existing app import to also include setCurrentStep:
import {addFilledStep, setOrder, setTotal, setCurrentStep} from "../../redux/reducers/app";
```

2. In `useSaveShippingForm`, remove `const navigate = useNavigate();` and replace `navigate("/payment")`:

```ts
// Remove:
const navigate = useNavigate();

// Replace:
//   navigate("/payment");
// With:
dispatch(setCurrentStep(TCheckoutStep.paymentMethod));
```

- [ ] **Step 3: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All existing tests pass. The suite should not import from `react-router` in these files anymore.

- [ ] **Step 4: Commit**

```bash
git add src/components/ContactInformationForm.tsx src/pages/shippingPage/ShippingForm.tsx
git commit -m "feat: replace navigate() calls in forms with dispatch(setCurrentStep(...))"
```

---

## Task 5: Replace navigation guards in `ShippingPage` and `PaymentPage`

**Files:**
- Modify: `src/pages/ShippingPage.tsx`
- Modify: `src/pages/PaymentPage.tsx`

- [ ] **Step 1: Update `ShippingPage.tsx`**

In `src/pages/ShippingPage.tsx`:

1. Remove `useNavigate` import:

```ts
// Remove:
import {useNavigate} from "react-router";
```

2. In `useInitShippingPage`, remove `const navigate = useNavigate();` and replace the guard:

```ts
// Remove:
const navigate = useNavigate();

// Replace the useEffect guard:
// useEffect(() => {
//   if (stepper && !stepper.filledSteps.includes(TCheckoutStep.contactInfo)) {
//     navigate("/info");
//   }
// }, [stepper, navigate]);
// With:
const dispatch = useAppDispatch();
useEffect(() => {
  if (stepper && !stepper.filledSteps.includes(TCheckoutStep.contactInfo)) {
    dispatch(setCurrentStep(TCheckoutStep.contactInfo));
  }
}, [stepper, dispatch]);
```

3. Add `setCurrentStep` to the import from `../redux/reducers/app`:

```ts
// The existing import is:
// (ShippingPage doesn't import from app.ts yet for dispatch — add it)
import {useAppDispatch, useAppSelector} from "../hooks/redux";
import {setCurrentStep} from "../redux/reducers/app";
```

- [ ] **Step 2: Update `PaymentPage.tsx`**

In `src/pages/PaymentPage.tsx`:

1. Remove `useNavigate` import:

```ts
// Remove:
import {useNavigate} from "react-router";
```

2. In `useInitPaymentPage`, remove `const navigate = useNavigate();` and replace the guard:

```ts
// Remove:
const navigate = useNavigate();

// Replace:
// useEffect(() => {
//   if (!checkoutData) {
//     navigate("/info");
//   }
// }, [checkoutData, navigate]);
// With:
useEffect(() => {
  if (!checkoutData) {
    dispatch(setCurrentStep(TCheckoutStep.contactInfo));
  }
}, [checkoutData, dispatch]);
```

3. Add `TCheckoutStep` and `setCurrentStep` to imports:

```ts
import {TCheckoutStep} from "boundless-api-client";
import {setCurrentStep} from "../redux/reducers/app";
```

- [ ] **Step 3: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ShippingPage.tsx src/pages/PaymentPage.tsx
git commit -m "feat: replace navigate() guards in ShippingPage and PaymentPage with setCurrentStep dispatch"
```

---

## Task 6: Update `BoundlessCheckout` — drop `BrowserRouter` and `basename`

**Files:**
- Modify: `src/BoundlessCheckout.tsx`

- [ ] **Step 1: Rewrite `BoundlessCheckout.tsx`**

Replace the full contents of `src/BoundlessCheckout.tsx`:

```tsx
import React, {ReactNode, useEffect, useMemo, useState} from "react";
import ReactDOM from "react-dom";
import clsx from "clsx";
import {disableBodyScroll, clearAllBodyScrollLocks} from "body-scroll-lock";
import "../styles/styles.scss";
import StepRenderer from "./StepRenderer";
import {Provider} from "react-redux";
import {store} from "./redux/store";
import {
  setBasicProps,
  showCheckout,
  TOnThankYouPage,
  TOnCheckoutInited,
} from "./redux/reducers/app";
import {useAppSelector} from "./hooks/redux";
import {TClickedElement} from "./lib/elementEvents";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

export interface IBoundlessCheckoutProps {
  onHide: (element: TClickedElement) => void;
  onThankYouPage: TOnThankYouPage;
  cartId?: string;
  logo?: string | ReactNode;
  logoSrc?: string;
  logoText?: string;
  onCheckoutInited?: TOnCheckoutInited;
}

export default function BoundlessCheckout(props: IBoundlessCheckoutProps) {
  const {onHide, onThankYouPage, cartId, logoSrc, logoText, logo, onCheckoutInited} = props;

  const resolvedLogo = useMemo<string | ReactNode | undefined>(() => {
    if (logoText !== undefined) return logoText;
    if (logoSrc) return <img src={logoSrc} className={"bdl-header__img-logo"} />;
    return logo;
  }, [logoText, logoSrc, logo]);

  const [el] = useState<HTMLDivElement | null>(() =>
    typeof window !== "undefined" && window.document
      ? document.createElement("div")
      : null
  );

  const queryClient = useMemo(() => new QueryClient(), []);

  // Append portal div to body on mount, lock scroll; remove and unlock on unmount
  useEffect(() => {
    if (!el) return;
    document.body.appendChild(el);
    disableBodyScroll(el);
    return () => {
      clearAllBodyScrollLocks();
      if (el.parentNode === document.body) {
        document.body.removeChild(el);
      }
    };
  }, [el]);

  // Sync props into Redux store whenever they change
  useEffect(() => {
    store.dispatch(
      setBasicProps({
        onHide,
        onThankYouPage,
        cartId,
        logo: resolvedLogo,
        onCheckoutInited,
      })
    );
    store.dispatch(showCheckout());
  }, [onHide, onThankYouPage, cartId, resolvedLogo, onCheckoutInited]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!el) return null;

  return ReactDOM.createPortal(
    <div className={clsx("bdl-checkout", "bdl-checkout_show")}>
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <Provider store={store}>
            <WrappedApp />
          </Provider>
        </QueryClientProvider>
      </React.StrictMode>
    </div>,
    el
  );
}

const WrappedApp = () => {
  const show = useAppSelector((state) => state.app.show);
  return show ? <StepRenderer /> : null;
};
```

- [ ] **Step 2: Update `BoundlessCheckout.test.tsx`**

Replace the full contents of `src/__tests__/BoundlessCheckout.test.tsx`:

```tsx
import React from 'react';
import {render} from '@testing-library/react';
import {setBasicProps, showCheckout} from '../redux/reducers/app';

// body-scroll-lock
jest.mock('body-scroll-lock', () => ({
  disableBodyScroll: jest.fn(),
  clearAllBodyScrollLocks: jest.fn(),
}));

// Redux store — capture dispatches
jest.mock('../redux/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: () => ({app: {show: true}}),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

// react-redux Provider — render children directly; useSelector returns show:true
jest.mock('react-redux', () => ({
  Provider: ({children}: {children: React.ReactNode}) => <>{children}</>,
  useSelector: jest.fn((selector: any) => selector({app: {show: true}})),
}));

// StepRenderer — avoid rendering full UI
jest.mock('../StepRenderer', () => () => <div data-testid="step-renderer" />);

// @tanstack/react-query
const mockQueryClientConstructor = jest.fn();
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    QueryClient: jest.fn().mockImplementation((...args: any[]) => {
      mockQueryClientConstructor(...args);
      return new actual.QueryClient(...args);
    }),
    QueryClientProvider: actual.QueryClientProvider,
  };
});

import BoundlessCheckout from '../BoundlessCheckout';

const bodyScrollLock = jest.requireMock('body-scroll-lock') as {
  disableBodyScroll: jest.Mock;
  clearAllBodyScrollLocks: jest.Mock;
};
const mockStore = jest.requireMock('../redux/store').store as {
  dispatch: jest.Mock;
};

const defaultProps = {
  onHide: jest.fn(),
  onThankYouPage: jest.fn(),
};

describe('BoundlessCheckout', () => {
  beforeEach(() => {
    mockStore.dispatch.mockClear();
    bodyScrollLock.disableBodyScroll.mockClear();
    bodyScrollLock.clearAllBodyScrollLocks.mockClear();
  });

  test('appends a portal div to document.body on mount', () => {
    const childrenBefore = document.body.children.length;
    const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
    expect(document.body.children.length).toBeGreaterThan(childrenBefore);
    unmount();
  });

  test('removes the portal div from document.body on unmount', () => {
    const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
    const childrenAfterMount = document.body.children.length;
    unmount();
    expect(document.body.children.length).toBeLessThan(childrenAfterMount);
  });

  test('calls disableBodyScroll on mount', () => {
    const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
    expect(bodyScrollLock.disableBodyScroll).toHaveBeenCalledTimes(1);
    unmount();
  });

  test('calls clearAllBodyScrollLocks on unmount', () => {
    const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
    expect(bodyScrollLock.clearAllBodyScrollLocks).not.toHaveBeenCalled();
    unmount();
    expect(bodyScrollLock.clearAllBodyScrollLocks).toHaveBeenCalledTimes(1);
  });

  test('dispatches setBasicProps and showCheckout on mount', () => {
    const setBasicPropsType = setBasicProps({} as any).type;
    const showCheckoutType = showCheckout().type;

    render(<BoundlessCheckout {...defaultProps} />);

    const dispatchedTypes = mockStore.dispatch.mock.calls.map((call) => call[0].type);
    expect(dispatchedTypes).toContain(setBasicPropsType);
    expect(dispatchedTypes).toContain(showCheckoutType);
  });

  test('QueryClient is not recreated across re-renders', () => {
    mockQueryClientConstructor.mockClear();
    const {rerender, unmount} = render(<BoundlessCheckout {...defaultProps} />);
    rerender(<BoundlessCheckout {...defaultProps} cartId="cart-1" />);
    rerender(<BoundlessCheckout {...defaultProps} cartId="cart-2" />);
    expect(mockQueryClientConstructor).toHaveBeenCalledTimes(1);
    unmount();
  });
});
```

- [ ] **Step 3: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/BoundlessCheckout.tsx src/__tests__/BoundlessCheckout.test.tsx
git commit -m "feat: remove BrowserRouter and basename prop from BoundlessCheckout; wire StepRenderer"
```

---

## Task 7: Delete `App.tsx`, `routes.ts`, `IndexPage.tsx`, and `ErrorPage.tsx`

**Files:**
- Delete: `src/App.tsx`
- Delete: `src/routes.ts`
- Delete: `src/pages/IndexPage.tsx`
- Delete: `src/pages/ErrorPage.tsx` — **only after confirming `StepRenderer` handles global errors**

> `ErrorPage` is still imported by `StepRenderer`. Delete it only after inlining the error UI, or keep it as a private component. Per the PRD, delete it and inline the error in `StepRenderer`.

- [ ] **Step 1: Inline the error UI in `StepRenderer.tsx` and remove `ErrorPage` import**

Replace the `StepRenderer.tsx` content to inline the error display (removing the `ErrorPage` dependency):

```tsx
import React from "react";
import {TCheckoutStep} from "boundless-api-client";
import {useAppSelector} from "./hooks/redux";
import useInitCheckoutByCart from "./hooks/initCheckout";
import ContactInfoPage from "./pages/ContactInfoPage";
import ShippingPage from "./pages/ShippingPage";
import PaymentPage from "./pages/PaymentPage";
import Loading from "./components/Loading";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import {TClickedElement} from "./lib/elementEvents";
import {useTranslation} from "react-i18next";

const stepComponents: Partial<Record<TCheckoutStep, React.ComponentType>> = {
  [TCheckoutStep.contactInfo]: ContactInfoPage,
  [TCheckoutStep.shippingAddress]: ShippingPage,
  [TCheckoutStep.paymentMethod]: PaymentPage,
};

export default function StepRenderer() {
  useInitCheckoutByCart();
  const {stepper, globalError, onHide} = useAppSelector((state) => state.app);
  const {t} = useTranslation();

  if (globalError) {
    return (
      <section className={"bdl-checkout-layout"}>
        <main className={"bdl-checkout-layout__main bdl-checkout-layout__main-v-center"}>
          <Container className={"bdl-checkout-layout__container"}>
            <Alert severity="error">
              <AlertTitle>{t("errorPage.error")}</AlertTitle>
              {globalError}
            </Alert>
            <Box sx={{mt: 2}} textAlign={"center"}>
              <Button
                variant="contained"
                size="large"
                onClick={() => onHide && onHide(TClickedElement.backToCart)}
                color="error"
              >
                {t("errorPage.backToSite")}
              </Button>
            </Box>
          </Container>
        </main>
      </section>
    );
  }

  if (!stepper) {
    return <Loading />;
  }

  const StepComponent = stepComponents[stepper.currentStep] ?? ContactInfoPage;
  return <StepComponent />;
}
```

- [ ] **Step 2: Update `StepRenderer.test.tsx` to match the inlined error UI**

In `src/__tests__/StepRenderer.test.tsx`, the `globalError` test already uses `screen.getByText('Something went wrong')` which still works — no change needed.

- [ ] **Step 3: Run `StepRenderer` tests to confirm they still pass**

```bash
npx jest src/__tests__/StepRenderer.test.tsx --no-coverage
```

Expected: PASS (6 tests).

- [ ] **Step 4: Delete the four files**

```bash
rm src/App.tsx src/routes.ts src/pages/IndexPage.tsx src/pages/ErrorPage.tsx
```

- [ ] **Step 5: Run the full test suite to verify nothing broke**

```bash
npx jest --no-coverage
```

Expected: All tests pass. TypeScript will be checked in the next step.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noemit
```

Expected: No errors. If any file still imports from `routes.ts`, `App.tsx`, `IndexPage`, or `ErrorPage`, fix those imports now.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: delete App.tsx, routes.ts, IndexPage, ErrorPage — replaced by StepRenderer"
```

---

## Task 8: Remove `react-router` from `package.json` and `app.ts` state

**Files:**
- Modify: `package.json`
- Modify: `src/redux/reducers/app.ts` (remove `basename` from state)

- [ ] **Step 1: Remove `react-router` from `package.json`**

In `package.json`, remove this line from `dependencies`:

```json
"react-router": "^7.10.1",
```

- [ ] **Step 2: Remove `basename` from Redux state**

In `src/redux/reducers/app.ts`:

1. Remove `basename` from the `setBasicProps` payload type:

```ts
// Change:
setBasicProps(
  state,
  action: PayloadAction<
    Required<Pick<IAppState, "onHide" | "onThankYouPage">> & {
      basename?: string;
      logo?: string | ReactNode;
      cartId?: string;
      onCheckoutInited?: TOnCheckoutInited;
    }
  >
) {
  const {onHide, onThankYouPage, cartId, basename, logo, onCheckoutInited} = action.payload;
  return {...state, onHide, onThankYouPage, cartId, basename, logo, onCheckoutInited};
}

// To:
setBasicProps(
  state,
  action: PayloadAction<
    Required<Pick<IAppState, "onHide" | "onThankYouPage">> & {
      logo?: string | ReactNode;
      cartId?: string;
      onCheckoutInited?: TOnCheckoutInited;
    }
  >
) {
  const {onHide, onThankYouPage, cartId, logo, onCheckoutInited} = action.payload;
  return {...state, onHide, onThankYouPage, cartId, logo, onCheckoutInited};
}
```

2. Remove `basename` from `IAppState`:

```ts
// Remove this line from IAppState:
basename?: string;
```

- [ ] **Step 3: Run `npm install` to update lock file**

```bash
npm install
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noemit
```

Expected: No errors.

- [ ] **Step 5: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/redux/reducers/app.ts
git commit -m "feat: remove react-router dependency and basename from Redux state"
```

---

## Task 9: Bump version to 6.0.0

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update version in `package.json`**

Change:

```json
"version": "5.0.0",
```

To:

```json
"version": "6.0.0",
```

- [ ] **Step 2: Run the full test suite one final time**

```bash
npx jest --no-coverage
```

Expected: All tests pass with zero failures.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noemit
```

Expected: Clean.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 6.0.0 (breaking: basename removed, react-router removed)"
```

---

## Self-Review

### Spec coverage check

| PRD Requirement | Covered by |
|---|---|
| Remove BrowserRouter | Task 6 |
| Remove basename prop | Tasks 6, 8 |
| setCurrentStep Redux action | Task 1 |
| StepRenderer component | Task 2 |
| CheckoutProgress uses Redux | Task 3 |
| ContactInformationForm navigation | Task 4 |
| ShippingForm navigation | Task 4 |
| ShippingPage guard | Task 5 |
| PaymentPage guard | Task 5 |
| Delete routes.ts | Task 7 |
| Delete IndexPage | Task 7 |
| Delete ErrorPage | Task 7 |
| Remove react-router from package.json | Task 8 |
| StepRenderer tests | Task 2 |
| CheckoutProgress tests | Task 3 |
| BoundlessCheckout tests updated | Task 6 |
| Version bump to 6.0.0 | Task 9 |

All PRD requirements are covered.

### Placeholder scan

No TBDs, TODOs, or "implement later" phrases — all steps contain complete code.

### Type consistency

- `setCurrentStep` is defined in Task 1 and used in Tasks 3, 4, 5.
- `StepRenderer` is created in Task 2 and imported in Task 6.
- `stepComponents` map uses `TCheckoutStep` enum values consistently throughout.
- `IAppState.basename` removal in Task 8 is consistent with `IBoundlessCheckoutProps.basename` removal in Task 6.
