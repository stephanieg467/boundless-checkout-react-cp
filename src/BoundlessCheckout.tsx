import React, { ReactNode, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import clsx from "clsx";
import { disableBodyScroll, clearAllBodyScrollLocks } from "body-scroll-lock";
import "../styles/styles.scss";
import StepRenderer from "./StepRenderer";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import {
	setBasicProps,
	showCheckout,
	TOnThankYouPage,
	TOnCheckoutInited,
} from "./redux/reducers/app";
import { useAppSelector } from "./hooks/redux";
import { TClickedElement } from "./lib/elementEvents";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
	const {
		onHide,
		onThankYouPage,
		cartId,
		logoSrc,
		logoText,
		logo,
		onCheckoutInited,
	} = props;

	const resolvedLogo = useMemo<string | ReactNode | undefined>(() => {
		if (logoText !== undefined) return logoText;
		if (logoSrc)
			return <img src={logoSrc} className={"bdl-header__img-logo"} />;
		return logo;
	}, [logoText, logoSrc, logo]);

	const [el] = useState<HTMLDivElement | null>(() =>
		typeof window !== "undefined" && window.document
			? document.createElement("div")
			: null,
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
			}),
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
		el,
	);
}

const WrappedApp = () => {
	const show = useAppSelector((state) => state.app.show);
	return show ? <StepRenderer /> : null;
};
