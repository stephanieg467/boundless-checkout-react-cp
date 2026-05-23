import React, {createContext, useContext, ReactNode} from "react";
import {TClickedElement} from "../lib/elementEvents";
import {TOnThankYouPage, TOnCheckoutInited} from "../redux/reducers/app";
import {IPayfirmaInfo} from "../types/Order";

export interface ICheckoutConfig {
	onHide: (element: TClickedElement, error?: string) => void;
	onThankYouPage: TOnThankYouPage;
	payfirmaInfo: IPayfirmaInfo;
	onCheckoutInited?: TOnCheckoutInited;
	logo?: string | ReactNode;
}

const CheckoutConfigContext = createContext<ICheckoutConfig | null>(null);

export const CheckoutConfigProvider = ({
	children,
	config,
}: {
	children: ReactNode;
	config: ICheckoutConfig;
}) => {
	return (
		<CheckoutConfigContext.Provider value={config}>
			{children}
		</CheckoutConfigContext.Provider>
	);
};

export const useCheckoutConfig = () => {
	const context = useContext(CheckoutConfigContext);
	if (!context) {
		throw new Error(
			"useCheckoutConfig must be used within a CheckoutConfigProvider"
		);
	}
	return context;
};
