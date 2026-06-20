import {configureStore} from "@reduxjs/toolkit";
import {TCheckoutStep} from "../types/common";
import appReducer from "../redux/reducers/app";
import {initCheckoutByCart} from "../redux/actions/checkout";
import {getCheckoutData} from "../hooks/checkoutData";
import {getCartOrRetrieve} from "../hooks/getCartOrRetrieve";
import {getOrderTaxes} from "../lib/taxes";
import {ordersDropShippingItems} from "../lib/products";
import {getCheckoutStepWarning} from "../lib/checkoutGuards";

jest.mock("../hooks/checkoutData", () => ({
	getCheckoutData: jest.fn(),
	setLocalStorageCheckoutData: jest.fn(),
}));

jest.mock("../hooks/getCartOrRetrieve", () => ({
	getCartOrRetrieve: jest.fn(),
	setCart: jest.fn(),
}));

jest.mock("../lib/taxes", () => ({
	getOrderTaxes: jest.fn(),
}));

jest.mock("../lib/products", () => ({
	ordersDropShippingItems: jest.fn(),
}));

const makeCartItem = () => ({
	qty: 1,
	total: "10.00",
	product: {
		ProductId: "product-1",
		Name: "Test product",
		ProductSpecifications: [],
		Prices: [{Price: 10}],
	},
});

const makeCart = () => ({
	id: "cart-1",
	items: [makeCartItem()],
	total: {total: "10.00", qty: 1},
});

const completeCustomer = (overrides: Record<string, unknown> = {}) => ({
	id: "customer-1",
	first_name: "Jane",
	last_name: "Doe",
	email: "jane@example.com",
	phone: "2505551234",
	dob: "1990-01-01",
	addresses: [],
	custom_attrs: {},
	...overrides,
});

const pickupService = () => ({
	service_id: 123,
	qty: 1,
	total_price: "0.00",
	serviceDelivery: {
		title: "Self Pickup",
		delivery: {title: "Self Pickup"},
	},
});

const makeOrder = (overrides: Record<string, unknown> = {}) => ({
	id: "cart-1",
	status_id: null,
	payment_method_id: null,
	paid_at: null,
	service_total_price: "0.00",
	payment_mark_up: null,
	total_price: "10.00",
	tip: "0.00",
	discount_for_order: null,
	discounts: [],
	tax_amount: "0.00",
	publishing_status: "published",
	created_at: "2026-01-01T00:00:00.000Z",
	customer: completeCustomer(),
	services: [pickupService()],
	tax_calculations: null,
	custom_attrs: {},
	...overrides,
});

const makeStore = (currentStep: TCheckoutStep) => configureStore({
	reducer: {app: appReducer},
	preloadedState: {
		app: {
			isInited: false,
			show: true,
			globalError: null,
			stepWarning: null,
			cartId: "cart-1",
			stepper: {
				currentStep,
				filledSteps: [],
				steps: [
					TCheckoutStep.contactInfo,
					TCheckoutStep.shippingAddress,
					TCheckoutStep.paymentMethod,
				],
			},
		},
	},
});

const dispatchInitCheckout = async (store: ReturnType<typeof makeStore>) => {
	await store.dispatch(initCheckoutByCart({}) as any);
	return store.getState().app as any;
};

describe("initCheckoutByCart", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(getCartOrRetrieve as jest.Mock).mockReturnValue(makeCart());
		(getOrderTaxes as jest.Mock).mockResolvedValue("0.00");
		(ordersDropShippingItems as jest.Mock).mockReturnValue([]);
	});

	it("normalizes a current step ahead of incomplete contact back to contactInfo and sets the contact warning", async () => {
		(getCheckoutData as jest.Mock).mockReturnValue({
			order: makeOrder({customer: undefined, services: []}),
			total: undefined,
		});
		const store = makeStore(TCheckoutStep.paymentMethod);

		const appState = await dispatchInitCheckout(store);

		expect(appState.stepper.currentStep).toBe(TCheckoutStep.contactInfo);
		expect(appState.stepWarning).toEqual(getCheckoutStepWarning(TCheckoutStep.contactInfo));
	});

	it("normalizes a current step ahead of incomplete shipping back to shippingAddress and sets the shipping warning", async () => {
		(getCheckoutData as jest.Mock).mockReturnValue({
			order: makeOrder({customer: completeCustomer(), services: []}),
			total: undefined,
		});
		const store = makeStore(TCheckoutStep.paymentMethod);

		const appState = await dispatchInitCheckout(store);

		expect(appState.stepper.currentStep).toBe(TCheckoutStep.shippingAddress);
		expect(appState.stepWarning).toEqual(getCheckoutStepWarning(TCheckoutStep.shippingAddress));
	});

	it("leaves currentStep unchanged when prerequisites before it are complete", async () => {
		(getCheckoutData as jest.Mock).mockReturnValue({
			order: makeOrder({customer: completeCustomer(), services: [pickupService()]}),
			total: undefined,
		});
		const store = makeStore(TCheckoutStep.paymentMethod);

		const appState = await dispatchInitCheckout(store);

		expect(appState.stepper.currentStep).toBe(TCheckoutStep.paymentMethod);
		expect(appState.stepWarning).toBeNull();
	});

	it("normalizes a persisted drop-ship-only currentStep when the recomputed flow no longer includes it", async () => {
		(getCheckoutData as jest.Mock).mockReturnValue({
			order: makeOrder({customer: completeCustomer(), services: [pickupService()]}),
			total: undefined,
		});
		const store = makeStore(TCheckoutStep.deliveryDetails);

		const appState = await dispatchInitCheckout(store);

		expect(appState.stepper.steps).not.toContain(TCheckoutStep.deliveryDetails);
		expect(appState.stepper.currentStep).toBe(TCheckoutStep.paymentMethod);
		expect(appState.stepper.steps).toContain(appState.stepper.currentStep);
		expect(appState.stepWarning).toBeNull();
	});
});
