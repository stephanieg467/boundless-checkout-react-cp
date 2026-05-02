import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/styles.scss";
import { initI18n } from "./i18n/funcs";
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
import { CheckoutConfigProvider } from "./contexts/CheckoutConfigContext";

initI18n();

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

	const [el, setEl] = useState<HTMLDivElement | null>(null);

	const queryClient = useMemo(() => new QueryClient(), []);

	useEffect(() => {
		const div = document.createElement("div");
		document.body.appendChild(div);
		setEl(div);
		return () => {
			if (div.parentNode === document.body) {
				document.body.removeChild(div);
			}
		};
	}, []); 

	useEffect(() => {
		store.dispatch(
			setBasicProps({
				cartId,
			}),
		);
		store.dispatch(showCheckout());
	}, [cartId]);

	const config = useMemo(
		() => ({ onHide, onThankYouPage, onCheckoutInited, logo: resolvedLogo }),
		[onHide, onThankYouPage, onCheckoutInited, resolvedLogo],
	);

	if (!el) return null;

	return createPortal(
		<div className={"bdl-checkout bdl-checkout_show"}>
			<React.StrictMode>
				<CheckoutConfigProvider config={config}>
					<QueryClientProvider client={queryClient}>
						<Provider store={store}>
							<WrappedApp />
						</Provider>
					</QueryClientProvider>
				</CheckoutConfigProvider>
			</React.StrictMode>
		</div>,
		el,
	);
}

const WrappedApp = () => {
	const show = useAppSelector((state) => state.app.show);
	return show ? <StepRenderer /> : null;
};
