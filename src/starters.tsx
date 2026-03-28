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
