import React from "react";
import {render, waitFor} from "@testing-library/react";
import {getCheckoutStepWarning} from "../lib/checkoutGuards";
import {setCurrentStep, setStepWarning} from "../redux/reducers/app";
import {TCheckoutStep} from "../types/common";
import {orderWith, stepperWith} from "./checkoutPageTestUtils";

(globalThis as any).React = React;

const mockDispatch = jest.fn();
let mockState: any = {};

jest.mock("../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
	useAppDispatch: () => mockDispatch,
}));

jest.mock("../hooks/initCheckout", () => () => ({isInited: true}));

jest.mock("../layout/CheckoutLayout", () => ({children}: {children: React.ReactNode}) => (
	<div data-testid="checkout-layout">{children}</div>
));

jest.mock("../components/Loading", () => () => <div data-testid="loading" />);

jest.mock("../pages/shippingPage/ShippingForm", () => () => (
	<div data-testid="shipping-form" />
));

jest.mock("../lib/products", () => ({cartHasTickets: () => false}));

jest.mock("../lib/deliveryTimes", () => ({
	getVancouverDateTime: () => ({month: 1, day: 1}),
}));

jest.mock("react-i18next", () => ({
	useTranslation: () => ({t: (key: string) => key}),
}));

import ShippingPage from "../pages/ShippingPage";

describe("ShippingPage prerequisite guard", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockState = {
			app: {
				items: [],
				order: orderWith({customer: undefined}),
				stepper: stepperWith({
					currentStep: TCheckoutStep.shippingAddress,
					filledSteps: [TCheckoutStep.contactInfo],
				}),
				stepWarning: null,
			},
		};
	});

	it("redirects to contactInfo and dispatches the contact warning when contact is incomplete", async () => {
		render(<ShippingPage />);

		await waitFor(() => {
			expect(mockDispatch).toHaveBeenCalledWith(
				setCurrentStep(TCheckoutStep.contactInfo),
			);
		});
		expect(mockDispatch).toHaveBeenCalledWith(
			setStepWarning(getCheckoutStepWarning(TCheckoutStep.contactInfo)),
		);
	});
});
