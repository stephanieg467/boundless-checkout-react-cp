import {vi} from "vitest";
import React from "react";

import {render, waitFor} from "@testing-library/react";
import PaymentPage from "../pages/PaymentPage";
import ShippingPage from "../pages/ShippingPage";
import {
	DELIVERY_INFO,
	PAY_IN_STORE_PAYMENT_METHOD,
	SELF_PICKUP_INFO,
	SHIPPING_DELIVERY_INFO,
} from "../constants";

const mockDispatch = vi.fn();

let mockState: any = {};

let mockCheckoutData: any = {};

const mockPaymentMethodForm = vi.fn();

const mockShippingForm = vi.fn();

const mockInitCheckout = vi.fn(() => ({isInited: true}));

vi.mock("../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
	useAppDispatch: () => mockDispatch,
}));

vi.mock("../hooks/initCheckout", () => ({
	default: () => mockInitCheckout(),
}));

vi.mock("../hooks/checkoutData", () => ({
	getCheckoutData: vi.fn(() => mockCheckoutData),
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({t: (key: string) => key}),
}));

vi.mock("../layout/CheckoutLayout", () => ({
	default: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock("../components/Loading", () => ({
	default: () => <div data-testid="loading" />,
}));

vi.mock("../pages/paymentPage/PaymentMethodForm", () => ({
	default: (props: any) => {
		mockPaymentMethodForm(props);

		return <div data-testid="payment-method-form" />;
	},
}));

vi.mock("../pages/shippingPage/ShippingForm", () => ({
	default: (props: any) => {
		mockShippingForm(props);

		return <div data-testid="shipping-form" />;
	},
}));

vi.mock("../lib/deliveryTimes", () => ({
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
		vi.clearAllMocks();
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
