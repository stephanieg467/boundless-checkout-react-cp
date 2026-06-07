import React from "react";
// Test-environment workaround for existing component runtime expectations.
global.React = React;
import {render, waitFor} from "@testing-library/react";
import PaymentPage from "../pages/PaymentPage";
import ShippingPage from "../pages/ShippingPage";
import {
	DELIVERY_INFO,
	PAY_IN_STORE_PAYMENT_METHOD,
	SELF_PICKUP_INFO,
	SHIPPING_DELIVERY_INFO,
} from "../constants";

const mockDispatch = jest.fn();
let mockState: any = {};
let mockCheckoutData: any = {};

const mockPaymentMethodForm = jest.fn();
const mockShippingForm = jest.fn();
const mockInitCheckout = jest.fn(() => ({isInited: true}));

jest.mock("../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
	useAppDispatch: () => mockDispatch,
}));

jest.mock("../hooks/initCheckout", () => ({
	__esModule: true,
	default: () => mockInitCheckout(),
}));

jest.mock("../hooks/checkoutData", () => ({
	getCheckoutData: jest.fn(() => mockCheckoutData),
}));

jest.mock("react-i18next", () => ({
	useTranslation: () => ({t: (key: string) => key}),
}));

jest.mock("../layout/CheckoutLayout", () => ({
	__esModule: true,
	default: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

jest.mock("../components/Loading", () => ({
	__esModule: true,
	default: () => <div data-testid="loading" />,
}));

jest.mock("../pages/paymentPage/PaymentMethodForm", () => ({
	__esModule: true,
	default: (props: any) => {
		mockPaymentMethodForm(props);
		return <div data-testid="payment-method-form" />;
	},
}));

jest.mock("../pages/shippingPage/ShippingForm", () => ({
	__esModule: true,
	default: (props: any) => {
		mockShippingForm(props);
		return <div data-testid="shipping-form" />;
	},
}));

jest.mock("../lib/deliveryTimes", () => ({
	getVancouverDateTime: () => ({month: 1, day: 1}),
}));

function makeOrder(overrides: any = {}) {
	return {
		id: "order-1",
		services: [{serviceDelivery: {title: "Self Pickup"}}],
		customer: {
			first_name: "Ada",
			last_name: "Lovelace",
			email: "ada@example.com",
			addresses: [],
		},
		...overrides,
	};
}

const workshopItem = {
	product: {ClassificationName: "Workshops"},
};

const flowerItem = {
	product: {ClassificationName: "Flower"},
};

function setCheckoutState(items: any[]) {
	const order = makeOrder();
	mockState = {
		app: {
			order,
			items,
			stepper: {steps: [], filledSteps: ["contactInfo"]},
		},
	};
	mockCheckoutData = {order, items};
}

describe("checkout ticket policy regressions", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockInitCheckout.mockReturnValue({isInited: true});
	});

	it("does not offer pay-in-store for workshop ticket carts", async () => {
		setCheckoutState([workshopItem]);

		render(<PaymentPage />);

		await waitFor(() => {
			expect(mockPaymentMethodForm).toHaveBeenCalledWith(
				expect.objectContaining({
					paymentPage: expect.objectContaining({
						paymentMethods: expect.not.arrayContaining([
							expect.objectContaining({
								payment_method_id: PAY_IN_STORE_PAYMENT_METHOD,
							}),
						]),
					}),
				}),
			);
		});
	});

	it("restricts workshop ticket carts to self pickup delivery", async () => {
		setCheckoutState([workshopItem]);

		render(<ShippingPage />);

		await waitFor(() => {
			expect(mockShippingForm).toHaveBeenCalledWith(
				expect.objectContaining({
					shippingPage: expect.objectContaining({
						options: expect.objectContaining({
							delivery: [SELF_PICKUP_INFO],
						}),
					}),
				}),
			);
		});
	});

	it("continues to offer all delivery options for non-ticket carts", async () => {
		setCheckoutState([flowerItem]);

		render(<ShippingPage />);

		await waitFor(() => {
			expect(mockShippingForm).toHaveBeenCalledWith(
				expect.objectContaining({
					shippingPage: expect.objectContaining({
						options: expect.objectContaining({
							delivery: [SELF_PICKUP_INFO, DELIVERY_INFO, SHIPPING_DELIVERY_INFO],
						}),
					}),
				}),
			);
		});
	});
});
