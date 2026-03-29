# Handoff: Remove React Router — Remaining Work

**Branch:** `master`
**Plan file:** `docs/superpowers/plans/2026-03-28-remove-react-router.md`
**PRD:** `docs/prd-remove-react-router.md`

---

## What's Done

All React Router call sites have been replaced with Redux `dispatch(setCurrentStep(...))`. The new `StepRenderer` component exists and is wired up (but not yet used by `BoundlessCheckout`).

| Commit | What it did |
|--------|-------------|
| `cc2eb89` | Added `setCurrentStep` action to Redux app slice + tests |
| `c4451e4` | Created `src/StepRenderer.tsx` + `src/__tests__/StepRenderer.test.tsx` |
| `f6d3b45` + `993a845` | Rewrote `CheckoutProgress` to use Redux + tests |
| `309bc8c` | Replaced `navigate()` in `ContactInformationForm` and `ShippingForm` |
| `9881249` | Replaced `navigate()` guards in `ShippingPage` and `PaymentPage` |

**Test suite status:** 17 tests passing across 4 suites.

---

## Remaining Tasks (5 tasks)

Pick up from **Task 5 review** — the implementation is done but the review was interrupted. Start by running `npx jest --no-coverage` to confirm 17 tests still pass, then proceed.

---

### Task 5 Review (finish this first — interrupted)

Task 5 code is already committed (`9881249`). Just run the reviews:

**Spec check:** Read `src/pages/ShippingPage.tsx` and `src/pages/PaymentPage.tsx` and verify:
- No `useNavigate` import in either file
- `ShippingPage` guard dispatches `setCurrentStep(TCheckoutStep.contactInfo)` with dep array `[stepper, dispatch]`
- `PaymentPage` guard dispatches `setCurrentStep(TCheckoutStep.contactInfo)` with dep array `[checkoutData, dispatch]`
- 17 tests pass, TypeScript compiles (`npx tsc --noemit`)

If clean, proceed to Task 6.

---

### Task 6: Update `BoundlessCheckout` — drop `BrowserRouter` and `basename`

**Files:** `src/BoundlessCheckout.tsx`, `src/__tests__/BoundlessCheckout.test.tsx`

Replace the full contents of `src/BoundlessCheckout.tsx` with:

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

Replace the full contents of `src/__tests__/BoundlessCheckout.test.tsx` with:

```tsx
import React from 'react';
import {render} from '@testing-library/react';
import {setBasicProps, showCheckout} from '../redux/reducers/app';

jest.mock('body-scroll-lock', () => ({
  disableBodyScroll: jest.fn(),
  clearAllBodyScrollLocks: jest.fn(),
}));

jest.mock('../redux/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: () => ({app: {show: true}}),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('react-redux', () => ({
  Provider: ({children}: {children: React.ReactNode}) => <>{children}</>,
  useSelector: jest.fn((selector: any) => selector({app: {show: true}})),
}));

jest.mock('../StepRenderer', () => () => <div data-testid="step-renderer" />);

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

Run `npx jest --no-coverage` — expect 17 tests pass (the old BrowserRouter mock is gone, StepRenderer mock replaces App mock).

Commit: `git commit --no-gpg-sign -m "feat: remove BrowserRouter and basename prop from BoundlessCheckout; wire StepRenderer"`

---

### Task 7: Delete dead files

After Task 6 passes, delete the four files that are no longer referenced:

```bash
rm src/App.tsx src/routes.ts src/pages/IndexPage.tsx src/pages/ErrorPage.tsx
```

Then:
- Run `npx tsc --noemit` — fix any remaining import errors (there should be none if Task 6 is done)
- Run `npx jest --no-coverage` — all tests should still pass
- Commit: `git commit --no-gpg-sign -m "feat: delete App.tsx, routes.ts, IndexPage, ErrorPage — replaced by StepRenderer"`

---

### Task 8: Remove `react-router` from `package.json` and `basename` from Redux state

**`package.json`** — remove this line from `dependencies`:
```json
"react-router": "^7.10.1",
```

**`src/redux/reducers/app.ts`** — two changes:

1. In `setBasicProps` payload type, remove `basename?: string;` from the `PayloadAction` generic and remove it from the destructure and return.

2. In `IAppState` interface (bottom of file), remove the line `basename?: string;`.

Then:
```bash
npm install
npx tsc --noemit
npx jest --no-coverage
git commit --no-gpg-sign -m "feat: remove react-router dependency and basename from Redux state"
```

---

### Task 9: Bump version to 6.0.0

In `package.json` change `"version": "5.0.0"` to `"version": "6.0.0"`.

```bash
npx jest --no-coverage  # final check
npx tsc --noemit
git commit --no-gpg-sign -m "chore: bump version to 6.0.0 (breaking: basename removed, react-router removed)"
```

---

## Key Notes for the New Session

- **All git commits must use `--no-gpg-sign`** — GPG signing is broken in this environment.
- **`TCheckoutStep` enum** is imported from `boundless-api-client` (external package, not defined in this repo).
- **`useAppSelector` and `useAppDispatch`** are in `src/hooks/redux.ts`.
- **`setCurrentStep`** is now exported from `src/redux/reducers/app.ts`.
- **`StepRenderer`** at `src/StepRenderer.tsx` is the new routing-free entry point — it reads `stepper.currentStep` from Redux and renders the matching page.
- The `nonLinear` prop on MUI's `<Stepper>` in `CheckoutProgress` is intentional — without it, MUI disables non-active step buttons and clicks don't fire.

## Quick Start for New Session

```bash
cd /home/sgalata/Projects/pProjects/boundless-checkout-react-cp
git log --oneline -5   # verify you're at the right commit
npx jest --no-coverage  # should show 17 tests passing
```

Then work through Tasks 6 → 7 → 8 → 9 in order. Each task is self-contained and the plan file has complete code for every step.
