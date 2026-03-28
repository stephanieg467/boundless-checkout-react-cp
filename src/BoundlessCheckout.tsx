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
