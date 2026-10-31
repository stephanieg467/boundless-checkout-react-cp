import {vi} from "vitest";
import React from "react";
import {render, waitFor} from "@testing-library/react";
import {getCheckoutStepWarning} from "../lib/checkoutGuards";
import {setCurrentStep, setStepWarning} from "../redux/reducers/app";
import {TCheckoutStep} from "../types/common";
import {orderWith, stepperWith} from "./checkoutPageTestUtils";

const mockDispatch = vi.fn();

let mockState: any = {};

vi.mock("../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
	useAppDispatch: () => mockDispatch,
}));

vi.mock("../hooks/initCheckout", () => ({default: () => ({isInited: true})}));

vi.mock("../layout/CheckoutLayout", () => ({
	default: ({children}: {children: React.ReactNode}) => (
		<div data-testid="checkout-layout">{children}</div>
	),
}));

vi.mock("../components/Loading", () => ({default: () => <div data-testid="loading" />}));

vi.mock("../pages/shippingPage/ShippingForm", () => ({
	default: () => <div data-testid="shipping-form" />,
}));

vi.mock("../lib/products", () => ({useCartHasTickets: () => false}));

vi.mock("../lib/deliveryTimes", () => ({
	getVancouverDateTime: () => ({month: 1, day: 1}),
}));

vi.mock("react-i18next", () => ({
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
