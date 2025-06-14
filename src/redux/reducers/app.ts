import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
	ICheckoutStepper,
	TCheckoutStep,
	ICustomer,
	ICurrency,
	ILocaleSettings,
	ISystemTax,
	ITotal,
} from "boundless-api-client";
import { ReactNode } from "react";
import { TClickedElement } from "../../lib/elementEvents";
import { CovaCartItem, CovaCheckoutInitData } from "../../types/cart";
import { ICovaCustomer, IOrderWithCustmAttr } from "../../types/Order";

const initialState: IAppState = {
	isInited: false,
	show: false,
	globalError: null,
	stepper: null,
};

const appSlice = createSlice({
	name: "app",
	initialState,
	reducers: {
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
			const {
				onHide,
				onThankYouPage,
				cartId,
				basename,
				logo,
				onCheckoutInited,
			} = action.payload;

			return {
				...state,
				onHide,
				onThankYouPage,
				cartId,
				basename,
				logo,
				onCheckoutInited,
			};
		},
		showCheckout(state) {
			state.show = true;
		},
		hideCheckout(state) {
			return {
				...state,
				show: false,
				isInited: false,
				globalError: null,
			};
		},
		setCheckoutData(
			state,
			action: PayloadAction<
				Required<
					Pick<
						IAppState,
						| "items"
						| "order"
						| "currency"
						| "localeSettings"
						| "stepper"
						| "hasCouponCampaigns"
						| "total"
					>
				>
			>
		) {
			const {
				items,
				order,
				currency,
				stepper,
				hasCouponCampaigns,
				total,
			} = action.payload;

			return {
				...state,
				items,
				order,
				currency,
				stepper,
				isInited: true,
				hasCouponCampaigns,
				total,
			};
		},
		setCheckoutInited(state, action: PayloadAction<{ isInited: boolean }>) {
			state.isInited = action.payload.isInited;
		},
		addFilledStep(state, action: PayloadAction<{ step: TCheckoutStep }>) {
			const { step } = action.payload;
			const stepper = state.stepper!;

			if (!stepper.filledSteps.includes(step)) {
				stepper.filledSteps.push(step);
			}
		},
		setOrder(state, action: PayloadAction<IOrderWithCustmAttr>) {
			const order = { ...action.payload };
			if (order && order.customer === null) {
				order.customer = undefined;
			}
			state.order = order;
		},
		setOrdersCustomer(state, action: PayloadAction<ICovaCustomer>) {
			const customer = action.payload;
			state.order!.customer = customer;
		},
		setGlobalError(state, action: PayloadAction<string | null>) {
			state.globalError = action.payload;
		},
		resetAppState() {
			localStorage.removeItem("cc_checkout_data")
			return { ...initialState };
		},
		setTotal(state, action: PayloadAction<ITotal>) {
			const total = action.payload;
			state.total = total;
		},
		setIsInited(state, action: PayloadAction<boolean>) {
			state.isInited = action.payload;
		},
		setLocaleSettings(state, action: PayloadAction<ILocaleSettings>) {
			state.localeSettings = action.payload;
		},
	},
});

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
} = appSlice.actions;

export default appSlice.reducer;

export type TOnThankYouPage = ({
	orderId,
	error,
}: {
	orderId: string;
	error?: string;
}) => void;
export type TOnCheckoutInited = (data: CovaCheckoutInitData) => void;

export interface IAppState {
	show: boolean;
	isInited: boolean;
	globalError: string | null;
	basename?: string;
	onHide?: (element: TClickedElement, error?: string) => void;
	onThankYouPage?: TOnThankYouPage;
	cartId?: string;
	items?: CovaCartItem[];
	order?: IOrderWithCustmAttr;
	currency?: ICurrency;
	localeSettings?: ILocaleSettings;
	taxSettings?: ISystemTax;
	logo?: string | ReactNode;
	stepper?: ICheckoutStepper | null;
	hasCouponCampaigns?: boolean;
	onCheckoutInited?: TOnCheckoutInited;
	total?: ITotal;
}
