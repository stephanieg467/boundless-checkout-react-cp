# BoundlessCheckout Functional Component Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `BoundlessCheckout` from a class component to a functional component, eliminating `ReactDOM.createRoot()` so the host app can render `<BoundlessCheckout>` directly in its own React tree.

**Architecture:** Replace the class component in `src/BoundlessCheckout.tsx` with a functional component using `useState`, `useEffect`, `useRef`, and `useMemo`. The `show` prop is removed — the host controls visibility by mounting/unmounting. `logoSrc`/`logoText` convenience props are added. `starters.tsx` receives only JSDoc deprecation comments, no functional changes.

**Tech Stack:** React 19, TypeScript, Redux Toolkit, React Router v7, `@tanstack/react-query`, `body-scroll-lock`, `ReactDOM.createPortal`

---

## File Map

| File | Change |
|---|---|
| `src/BoundlessCheckout.tsx` | Full rewrite — class → functional component |
| `src/starters.tsx` | JSDoc `@deprecated` comments on `StarterWrapper`, `startCheckout`, `startOrderInfo` |

---

### Task 1: Add `@deprecated` JSDoc to legacy starters

**Files:**
- Modify: `src/starters.tsx`

- [ ] **Step 1: Add deprecation comments**

Open `src/starters.tsx` and replace the existing exports with the annotated versions below. Do not change any logic.

```tsx
import React, {ReactNode} from "react";
import ReactDOM, {Root} from "react-dom/client";
import BoundlessCheckout, {IBoundlessCheckoutProps} from "./BoundlessCheckout";
import BoundlessOrderInfo, {BoundlessOrderInfoProps} from "./BoundlessOrderInfo";
import {store} from "./redux/store";
import {resetState} from "./redux/actions/app";
import {initI18n} from "./i18n/funcs";
initI18n();

/**
 * @deprecated Internal wrapper used by startCheckout/startOrderInfo.
 * Use the exported React components directly instead.
 */
export class StarterWrapper {
	protected root?: Root;

	constructor(
		protected el: HTMLElement,
		protected component: ReactNode
	) {
	}

	start() {
		this.root = ReactDOM.createRoot(this.el);
		this.root.render(<>{this.component}</>);
	}

	destroy() {
		this.root?.unmount();
	}
}

/**
 * @deprecated Use the `<BoundlessCheckout>` component directly instead.
 * This function calls ReactDOM.createRoot() which causes React version
 * mismatches in Next.js App Router environments.
 *
 * @example
 * // New API — render directly in your JSX tree:
 * <BoundlessCheckout
 *   cartId={cartId}
 *   onHide={onHide}
 *   onThankYouPage={onThankYouPage}
 *   basename="/checkout"
 *   logoSrc={logoSrc}
 * />
 */
export function startCheckout(el: HTMLElement, props: Omit<IBoundlessCheckoutProps, "logo"> & {
	logoSrc?: string,
	logoText?: string
}): StarterWrapper {
	let logo: string|ReactNode|undefined;
	if (props.logoText !== undefined) {
		logo = props.logoText;
	} else if (props.logoSrc) {
		logo = <img src={props.logoSrc} className={"bdl-header__img-logo"} />;
	}

	const wrapper = new StarterWrapper(el, <BoundlessCheckout
		logo={logo}
		{...props}
	/>);
	wrapper.start();

	return wrapper;
}

/**
 * @deprecated Use the `<BoundlessOrderInfo>` component directly instead.
 */
export function startOrderInfo(el: HTMLElement, props: BoundlessOrderInfoProps): StarterWrapper {
	const wrapper = new StarterWrapper(el, <BoundlessOrderInfo {...props} />);
	wrapper.start();

	return wrapper;
}

export function resetCheckoutState() {
	store.dispatch(resetState());
}
```

> Note: `show={true}` is removed from the `startCheckout` call because `show` will no longer exist on `IBoundlessCheckoutProps` after Task 2.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run verify
```

Expected: No errors. (This will temporarily fail if run before Task 2 removes `show` from `IBoundlessCheckoutProps` — that's fine, run this step again after Task 2.)

- [ ] **Step 3: Commit**

```bash
git add src/starters.tsx
git commit -m "docs: deprecate StarterWrapper, startCheckout, startOrderInfo in favour of direct component usage"
```

---

### Task 2: Rewrite `BoundlessCheckout` as a functional component

**Files:**
- Modify: `src/BoundlessCheckout.tsx`

This task replaces the entire class component with a functional component. The following behaviours must be preserved:
- Portal div created once, appended to `document.body` on mount, removed on unmount
- Body scroll locked on mount, unlocked on unmount
- Redux store populated with props via `setBasicProps` / `showCheckout` on mount and whenever props change
- `QueryClient` instance is stable (not recreated on re-render)
- `ReactDOM.createPortal` used for rendering into the portal div
- `WrappedApp` inner component unchanged

- [ ] **Step 1: Replace the file contents**

Replace `src/BoundlessCheckout.tsx` entirely with:

```tsx
import React, {ReactNode, useEffect, useMemo, useRef, useState} from "react";
import ReactDOM from "react-dom";
import clsx from "clsx";
import {disableBodyScroll, clearAllBodyScrollLocks} from "body-scroll-lock";
import "../styles/styles.scss";
import CheckoutApp from "./App";
import {Provider} from "react-redux";
import {store} from "./redux/store";
import {
	setBasicProps,
	showCheckout,
	TOnThankYouPage,
	TOnCheckoutInited,
} from "./redux/reducers/app";
import {BrowserRouter} from "react-router";
import {useAppSelector} from "./hooks/redux";
import {TClickedElement} from "./lib/elementEvents";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

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

export default function BoundlessCheckout(props: IBoundlessCheckoutProps) {
	const {onHide, onThankYouPage, cartId, basename, logoSrc, logoText, logo, onCheckoutInited} = props;

	const resolvedLogo: string | ReactNode | undefined =
		logoText !== undefined
			? logoText
			: logoSrc
				? <img src={logoSrc} className={"bdl-header__img-logo"} />
				: logo;

	const [el] = useState<HTMLDivElement | null>(() =>
		typeof window !== "undefined" && window.document
			? document.createElement("div")
			: null
	);

	const rootElRef = useRef<HTMLDivElement | null>(null);

	const queryClient = useMemo(() => new QueryClient(), []);

	// Append portal div to body on mount, remove on unmount
	useEffect(() => {
		if (!el) return;
		document.body.appendChild(el);
		return () => {
			clearAllBodyScrollLocks();
			if (el.parentNode === document.body) {
				document.body.removeChild(el);
			}
		};
	}, [el]);

	// Lock body scroll on mount, unlock handled by clearAllBodyScrollLocks in cleanup above
	useEffect(() => {
		if (rootElRef.current) {
			disableBodyScroll(rootElRef.current);
		}
	}, []);

	// Sync props into Redux store whenever they change
	useEffect(() => {
		store.dispatch(
			setBasicProps({
				onHide,
				onThankYouPage,
				cartId,
				basename,
				logo: resolvedLogo,
				onCheckoutInited,
			})
		);
		store.dispatch(showCheckout());
	}, [onHide, onThankYouPage, cartId, basename, resolvedLogo, onCheckoutInited]); // eslint-disable-line react-hooks/exhaustive-deps

	if (!el) return null;

	return ReactDOM.createPortal(
		<div
			className={clsx("bdl-checkout", "bdl-checkout_show")}
			ref={rootElRef}
		>
			<React.StrictMode>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<BrowserRouter basename={basename}>
							<WrappedApp />
						</BrowserRouter>
					</Provider>
				</QueryClientProvider>
			</React.StrictMode>
		</div>,
		el
	);
}

const WrappedApp = () => {
	const show = useAppSelector((state) => state.app.show);

	useEffect(() => {
		/*
		Это не работает - если я нахожусь на /payment и делаю refresh, то перекинет на info (или current step),
		что неверно. Возможно, нужно на закрытии делать navigateTo(/checkout) (или этот кусок вынести в sample).
		Те явно когда пользователь кликнул close - тогда меняем url.

		if (!show) {
			if (location.pathname !== '/') {
				navigate('/', {replace: true});
			}
		}*/
	}, [show]);

	return show ? <CheckoutApp /> : null;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run verify
```

Expected: No errors.

- [ ] **Step 3: Build the package**

```bash
npm run build
```

Expected: Build completes with no errors and `dist/` is populated.

- [ ] **Step 4: Commit**

```bash
git add src/BoundlessCheckout.tsx
git commit -m "refactor: rewrite BoundlessCheckout as functional component, remove show prop, add logoSrc/logoText props"
```

---

### Task 3: Final verification

- [ ] **Step 1: Run full type check and build**

```bash
npm run verify && npm run build
```

Expected: Both commands complete with no errors.

- [ ] **Step 2: Verify `show` prop is gone from public types**

Check `dist/src/index.d.ts` after build:

```bash
grep -n "show" dist/src/index.d.ts
```

Expected: No line referencing `show?: boolean` or `show: boolean` in `IBoundlessCheckoutProps`. (`show` may still appear in internal Redux state types — that is fine.)

- [ ] **Step 3: Verify `logoSrc` and `logoText` are in public types**

```bash
grep -n "logoSrc\|logoText" dist/src/index.d.ts
```

Expected: Both `logoSrc?: string` and `logoText?: string` appear in the output.

- [ ] **Step 4: Verify `resetCheckoutState` is still exported**

```bash
grep -n "resetCheckoutState" dist/src/index.d.ts
```

Expected: `resetCheckoutState` appears as an exported function.

- [ ] **Step 5: Commit**

```bash
git add dist/
git commit -m "chore: rebuild dist after BoundlessCheckout functional refactor"
```
