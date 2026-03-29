# Design: Refactor BoundlessCheckout to Functional Component

**Date:** 2026-03-28
**Status:** Approved

## Context

`BoundlessCheckout` is currently a class component in `src/BoundlessCheckout.tsx`. When used inside a Next.js 16 App Router host application, the `startCheckout()` function calls `ReactDOM.createRoot()` imperatively, which causes a React version mismatch at runtime because Next.js resolves `react-dom` to its own internal canary copy.

The fix is two-fold:
1. Refactor `BoundlessCheckout` from a class component to a functional component using modern React hooks
2. Update the props interface so the host app renders `<BoundlessCheckout>` directly in its own tree — no `createRoot` needed

## Goals

- Eliminate `ReactDOM.createRoot()` from the package's rendering path
- Rewrite `BoundlessCheckout` as a functional component using hooks
- Update `IBoundlessCheckoutProps` to remove `show` and add `logoSrc`/`logoText`
- Deprecate `startCheckout`, `startOrderInfo`, and `StarterWrapper` with JSDoc
- Keep all existing functionality: portal rendering, body scroll lock, Redux, Router, QueryClient

## Out of Scope

- Rewriting `BoundlessOrderInfo` or any other component
- Changing Redux store architecture
- Changing routing logic

---

## Section 1: Component Architecture

**File:** `src/BoundlessCheckout.tsx`

Replace the class component with a functional component. Lifecycle method mapping:

| Class pattern | Functional equivalent |
|---|---|
| `constructor` — creates portal `div`, `createRef` | `useRef` for rootElRef; `useState` (lazy init) or module-level for portal div |
| `componentDidMount` — appends div to body, dispatches `setBasicProps` | `useEffect(fn, [])` — appends div, returns cleanup that removes it and clears scroll locks |
| `componentDidMount` — dispatches props to Redux | `useEffect(fn, [onHide, onThankYouPage, cartId, basename, logo, onCheckoutInited])` |
| `componentDidUpdate` on `show` change — body scroll lock | Removed — `show` prop is removed; component is always "shown" when mounted |
| `componentWillUnmount` — removes div, clears scroll locks | Cleanup return in the mount `useEffect` |
| `render` — `ReactDOM.createPortal` | Same, returned from the function body |

**QueryClient stabilization:** The current class renders `new QueryClient()` inside `render()`, creating a new client on every render. The functional component will use `useMemo(() => new QueryClient(), [])` to stabilize it.

**Portal div creation:** Use `useState` with a lazy initializer to create the `div` once:
```typescript
const [el] = useState<HTMLDivElement | null>(() =>
  typeof window !== 'undefined' ? document.createElement('div') : null
);
```

**Body scroll lock:** Since `show` is removed, the component locks scroll on mount and unlocks on unmount via the `useEffect` cleanup.

---

## Section 2: Props Interface & Exports

### Updated `IBoundlessCheckoutProps`

```typescript
export interface IBoundlessCheckoutProps {
  onHide: (element: TClickedElement) => void;
  onThankYouPage: TOnThankYouPage;
  cartId?: string;
  basename?: string;
  logo?: string | ReactNode;
  logoSrc?: string;
  logoText?: string;
  onCheckoutInited?: TOnCheckoutInited;
}
```

**Changes from current interface:**
- `show: boolean` — **removed**. The host controls visibility by mounting/unmounting.
- `logoSrc?: string` — **added**. Convenience prop; component derives `logo` from it internally.
- `logoText?: string` — **added**. Convenience prop; component derives `logo` from it internally.

**Logo derivation inside the component:**
```typescript
const resolvedLogo = logoText !== undefined
  ? logoText
  : logoSrc
    ? <img src={logoSrc} className="bdl-header__img-logo" />
    : logo;
```

### `src/index.ts` exports

No changes to what is exported. `BoundlessCheckout` (now functional) remains the primary export. `resetCheckoutState` is unchanged.

---

## Section 3: Deprecation of Legacy Starters

**File:** `src/starters.tsx` — no functional changes, JSDoc only.

```typescript
/**
 * @deprecated Use the `<BoundlessCheckout>` component directly instead.
 * This function calls ReactDOM.createRoot() which causes React version
 * mismatches in Next.js App Router environments.
 *
 * @example
 * // New API:
 * <BoundlessCheckout cartId={cartId} onHide={onHide} onThankYouPage={onThankYouPage} basename="/checkout" logoSrc={logoSrc} />
 */
export function startCheckout(...) { ... }

/**
 * @deprecated Use the `<BoundlessOrderInfo>` component directly instead.
 */
export function startOrderInfo(...) { ... }

/**
 * @deprecated Internal wrapper used by startCheckout/startOrderInfo.
 * Use the exported React components directly.
 */
export class StarterWrapper { ... }
```

---

## Section 4: Verification

1. **Build** — `npm run build` completes with no TypeScript errors
2. **Type check** — `IBoundlessCheckoutProps` no longer requires `show`; `logoSrc`/`logoText` are valid props
3. **Smoke test** — Render `<BoundlessCheckout cartId="..." onHide={fn} onThankYouPage={fn} />` in a host app; modal appears, body scroll is locked
4. **Cleanup** — Unmounting the component removes the portal div from `document.body` and releases body scroll lock
5. **QueryClient stability** — Query client is not recreated on re-renders
