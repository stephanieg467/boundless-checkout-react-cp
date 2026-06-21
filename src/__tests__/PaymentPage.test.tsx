import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import {getCheckoutStepWarning} from "../lib/checkoutGuards";
import {setCurrentStep, setStepWarning} from "../redux/reducers/app";
import {TCheckoutStep} from "../types/common";
import {
	completeCustomer,
	orderWith,
	pickupService,
	stepperWith,
} from "./checkoutPageTestUtils";

const mockDispatch = jest.fn();
let mockState: any = {};
let mockCheckoutData: any = {};

jest.mock("../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
	useAppDispatch: () => mockDispatch,
}));

jest.mock("../hooks/initCheckout", () => () => ({isInited: true}));

jest.mock("../hooks/checkoutData", () => ({
	getCheckoutData: () => mockCheckoutData,
}));

jest.mock("../layout/CheckoutLayout", () => ({children}: {children: React.ReactNode}) => (
	<div data-testid="checkout-layout">{children}</div>
));

jest.mock("../components/Loading", () => () => <div data-testid="loading" />);

jest.mock("../pages/paymentPage/PaymentMethodForm", () => ({paymentPage}: any) => (
	<div data-testid="payment-method-form">
		{paymentPage.paymentMethods.map((method: any) => method.title).join(", ")}
	</div>
));

jest.mock("../lib/products", () => ({useCartHasTickets: () => false}));

jest.mock("react-i18next", () => ({
	useTranslation: () => ({t: (key: string) => key}),
}));

import PaymentPage from "../pages/PaymentPage";

const checkoutSteps = [
	TCheckoutStep.contactInfo,
	TCheckoutStep.shippingAddress,
	TCheckoutStep.paymentMethod,
];

const renderPaymentPage = (
	appState: Record<string, unknown>,
	checkoutData: unknown = {order: (appState as any).order},
) => {
	mockState = {app: appState};
	mockCheckoutData = checkoutData;
	return render(<PaymentPage />);
};

describe("PaymentPage prerequisite guard", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockCheckoutData = {};
	});

	it("redirects to contactInfo and dispatches the contact warning when contact is incomplete", async () => {
		renderPaymentPage({
			order: orderWith({customer: undefined, services: []}),
			stepper: stepperWith({
				currentStep: TCheckoutStep.paymentMethod,
				steps: checkoutSteps,
				filledSteps: [TCheckoutStep.contactInfo, TCheckoutStep.shippingAddress],
			}),
			stepWarning: null,
		});

		await waitFor(() => {
			expect(mockDispatch).toHaveBeenCalledWith(
				setCurrentStep(TCheckoutStep.contactInfo),
			);
		});
		expect(mockDispatch).toHaveBeenCalledWith(
			setStepWarning(getCheckoutStepWarning(TCheckoutStep.contactInfo)),
		);
	});

	it("keeps missing checkout data redirected to contactInfo even when Redux state would fail shipping", async () => {
		renderPaymentPage(
			{
				order: orderWith({customer: completeCustomer(), services: []}),
				stepper: stepperWith({
					currentStep: TCheckoutStep.paymentMethod,
					steps: checkoutSteps,
					filledSteps: [TCheckoutStep.contactInfo],
				}),
				stepWarning: null,
			},
			null,
		);

		await waitFor(() => {
			expect(mockDispatch).toHaveBeenCalledWith(
				setCurrentStep(TCheckoutStep.contactInfo),
			);
		});
		expect(mockDispatch).toHaveBeenCalledWith(
			setStepWarning(getCheckoutStepWarning(TCheckoutStep.contactInfo)),
		);
		expect(mockDispatch).not.toHaveBeenCalledWith(
			setCurrentStep(TCheckoutStep.shippingAddress),
		);
		expect(mockDispatch).not.toHaveBeenCalledWith(
			setStepWarning(getCheckoutStepWarning(TCheckoutStep.shippingAddress)),
		);
	});

	it("redirects to shippingAddress and dispatches the shipping warning when contact is complete but shipping is incomplete", async () => {
		renderPaymentPage({
			order: orderWith({customer: completeCustomer(), services: []}),
			stepper: stepperWith({
				currentStep: TCheckoutStep.paymentMethod,
				steps: checkoutSteps,
				filledSteps: [TCheckoutStep.contactInfo],
			}),
			stepWarning: null,
		});

		await waitFor(() => {
			expect(mockDispatch).toHaveBeenCalledWith(
				setCurrentStep(TCheckoutStep.shippingAddress),
			);
		});
		expect(mockDispatch).toHaveBeenCalledWith(
			setStepWarning(getCheckoutStepWarning(TCheckoutStep.shippingAddress)),
		);
	});

	it("allows pickup service with complete contact and no address", async () => {
		renderPaymentPage({
			order: orderWith({
				customer: completeCustomer({addresses: []}),
				services: [pickupService()],
			}),
			stepper: stepperWith({
				currentStep: TCheckoutStep.paymentMethod,
				steps: checkoutSteps,
				filledSteps: [TCheckoutStep.contactInfo, TCheckoutStep.shippingAddress],
			}),
			stepWarning: null,
		});

		expect(await screen.findByTestId("payment-method-form")).toBeInTheDocument();
		expect(mockDispatch).not.toHaveBeenCalledWith(
			setCurrentStep(TCheckoutStep.contactInfo),
		);
		expect(mockDispatch).not.toHaveBeenCalledWith(
			setCurrentStep(TCheckoutStep.shippingAddress),
		);
		expect(mockDispatch).not.toHaveBeenCalledWith(
			setStepWarning(getCheckoutStepWarning(TCheckoutStep.contactInfo)),
		);
		expect(mockDispatch).not.toHaveBeenCalledWith(
			setStepWarning(getCheckoutStepWarning(TCheckoutStep.shippingAddress)),
		);
	});
});
