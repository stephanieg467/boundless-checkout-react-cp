import React from "react";
import {render, waitFor} from "@testing-library/react";
import {getCheckoutStepWarning} from "../lib/checkoutGuards";
import {setCurrentStep, setStepWarning} from "../redux/reducers/app";
import {TCheckoutStep} from "../types/common";
import {completeCustomer, orderWith, stepperWith} from "./checkoutPageTestUtils";

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

jest.mock("../pages/deliveryDetailsPage/DeliveryDetailsForm", () => () => (
	<div data-testid="delivery-details-form" />
));

import DeliveryDetailsPage from "../pages/DeliveryDetailsPage";

const checkoutSteps = [
	TCheckoutStep.contactInfo,
	TCheckoutStep.shippingAddress,
	TCheckoutStep.deliveryDetails,
	TCheckoutStep.paymentMethod,
];

describe("DeliveryDetailsPage prerequisite guard", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("redirects to contactInfo and dispatches the contact warning when contact is incomplete", async () => {
		mockState = {
			app: {
				order: orderWith({customer: undefined}),
				stepper: stepperWith({
					currentStep: TCheckoutStep.deliveryDetails,
					steps: checkoutSteps,
					filledSteps: [],
				}),
				stepWarning: null,
			},
		};

		render(<DeliveryDetailsPage />);

		await waitFor(() => {
			expect(mockDispatch).toHaveBeenCalledWith(
				setCurrentStep(TCheckoutStep.contactInfo),
			);
		});
		expect(mockDispatch).toHaveBeenCalledWith(
			setStepWarning(getCheckoutStepWarning(TCheckoutStep.contactInfo)),
		);
	});

	it("redirects to shippingAddress and dispatches the shipping warning when contact is complete but shipping is incomplete", async () => {
		mockState = {
			app: {
				order: orderWith({customer: completeCustomer(), services: []}),
				stepper: stepperWith({
					currentStep: TCheckoutStep.deliveryDetails,
					steps: checkoutSteps,
					filledSteps: [TCheckoutStep.contactInfo],
				}),
				stepWarning: null,
			},
		};

		render(<DeliveryDetailsPage />);

		await waitFor(() => {
			expect(mockDispatch).toHaveBeenCalledWith(
				setCurrentStep(TCheckoutStep.shippingAddress),
			);
		});
		expect(mockDispatch).toHaveBeenCalledWith(
			setStepWarning(getCheckoutStepWarning(TCheckoutStep.shippingAddress)),
		);
	});
});
