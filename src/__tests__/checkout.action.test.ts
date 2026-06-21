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

const makeStore = (
	currentStep: TCheckoutStep,
	appOverrides: Record<string, unknown> = {},
) => configureStore({
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
			...appOverrides,
		},
	},
});

const dispatchInitCheckout = async (
	store: ReturnType<typeof makeStore>,
	config: Parameters<typeof initCheckoutByCart>[0] = {},
) => {
	await store.dispatch(initCheckoutByCart(config) as any);
	return store.getState().app as any;
};

describe("initCheckoutByCart", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(getCartOrRetrieve as jest.Mock).mockReturnValue(makeCart());
		(getOrderTaxes as jest.Mock).mockResolvedValue("0.00");
		(ordersDropShippingItems as jest.Mock).mockReturnValue([]);
	});

	it("sets a global error and aborts when the cart is empty", async () => {
		const onCheckoutInited = jest.fn();

		(getCartOrRetrieve as jest.Mock).mockReturnValue({
			...makeCart(),
			items: [],
		});

		const store = makeStore(TCheckoutStep.contactInfo);

		await store.dispatch(initCheckoutByCart({onCheckoutInited}) as any);

		const appState = store.getState().app as any;

		expect(appState.globalError).toBe(
			"Your cart is empty. Please go back to the site and start shopping.",
		);
		expect(appState.isInited).toBe(false);
		expect(appState.order).toBeUndefined();
		expect(getCheckoutData).not.toHaveBeenCalled();
		expect(getOrderTaxes).not.toHaveBeenCalled();
		expect(ordersDropShippingItems).not.toHaveBeenCalled();
		expect(onCheckoutInited).not.toHaveBeenCalled();
	});

	it("fetches taxes and builds fallback order and total tax summaries when checkout data has no tax amount", async () => {
		const cart = makeCart();

		(getCartOrRetrieve as jest.Mock).mockReturnValue(cart);
		(getCheckoutData as jest.Mock).mockReturnValue({
			order: undefined,
			total: undefined,
		});
		(getOrderTaxes as jest.Mock).mockResolvedValue("1.23");

		const store = makeStore(TCheckoutStep.contactInfo);

		const appState = await dispatchInitCheckout(store);

		expect(getOrderTaxes).toHaveBeenCalledTimes(1);
		expect(getOrderTaxes).toHaveBeenCalledWith(cart.items);
		expect(appState.order).toMatchObject({
			id: "cart-1",
			tax_amount: "1.23",
			total_price: "11.23",
			custom_attrs: {
				shippingTax: "0.00",
				serviceRate: "0.00",
				checkoutInited: true,
			},
		});
		expect(appState.order.tax_calculations).toMatchObject({
			price: "1.23",
			itemsSubTotal: {
				price: "10.00",
				qty: 1,
			},
			discount: "0",
			tax: {
				totalTaxAmount: "1.23",
				itemsWithTax: cart.items,
				shipping: {
					shippingTaxes: undefined,
				},
			},
			servicesSubTotal: {
				price: 0,
				qty: 0,
			},
		});
		expect(appState.total).toMatchObject({
			price: "11.23",
			tax: {
				totalTaxAmount: "1.23",
				itemsWithTax: cart.items,
			},
		});
	});

	it("sets the checkout initialization error and aborts when tax lookup fails", async () => {
		const taxError = new Error("tax service unavailable");
		const onCheckoutInited = jest.fn();
		const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		(getCheckoutData as jest.Mock).mockReturnValue({});
		(getOrderTaxes as jest.Mock).mockRejectedValue(taxError);

		try {
			const store = makeStore(TCheckoutStep.contactInfo);
			const appState = await dispatchInitCheckout(store, {onCheckoutInited});

			expect(getOrderTaxes).toHaveBeenCalledWith(makeCart().items);
			expect(consoleSpy).toHaveBeenCalledWith(taxError);
			expect(appState.globalError).toBe(
				"Cannot initialize checkout. Please go back to the cart and try again.",
			);
			expect(appState.isInited).toBe(false);
			expect(appState.order).toBeUndefined();
			expect(appState.total).toBeUndefined();
			expect(onCheckoutInited).not.toHaveBeenCalled();
		} finally {
			consoleSpy.mockRestore();
		}
	});

	it("reuses persisted tax data and total without calling the tax API", async () => {
		const taxCalculations = {
			price: "2.34",
			itemsSubTotal: {
				price: "10.00",
				qty: 1,
			},
			discount: "0",
			tax: {
				totalTaxAmount: "2.34",
				itemsWithTax: [],
				shipping: {
					shippingTaxes: "0.34",
				},
			},
			servicesSubTotal: {
				price: "0.00",
				qty: 0,
			},
		};
		const persistedTotal = {
			price: "12.34",
			itemsSubTotal: {
				price: "10.00",
				qty: 1,
			},
			discount: "0",
			tax: {
				totalTaxAmount: "2.34",
				itemsWithTax: [],
				shipping: {
					shippingTaxes: "0.34",
				},
			},
			servicesSubTotal: {
				price: "0.00",
				qty: 0,
			},
		};

		(getCheckoutData as jest.Mock).mockReturnValue({
			order: makeOrder({
				tax_amount: "2.34",
				total_price: "12.34",
				tax_calculations: taxCalculations,
			}),
			total: persistedTotal,
		});

		const store = makeStore(TCheckoutStep.contactInfo);

		const appState = await dispatchInitCheckout(store);

		expect(getOrderTaxes).not.toHaveBeenCalled();
		expect(appState.order.tax_amount).toBe("2.34");
		expect(appState.order.total_price).toBe("12.34");
		expect(appState.order.tax_calculations).toBe(taxCalculations);
		expect(appState.total).toBe(persistedTotal);
	});

	it("preserves persisted order fields and merges custom attribute defaults", async () => {
		const customer = completeCustomer();
		const services = [pickupService()];
		const discounts = [{id: "discount-1", title: "Loyalty discount"}];

		(getCheckoutData as jest.Mock).mockReturnValue({
			order: makeOrder({
				payment_method_id: "payment-method-1",
				paid_at: "2026-01-02T00:00:00.000Z",
				service_total_price: "4.00",
				total_price: "14.00",
				tip: "2.00",
				delivery_time: "2026-01-03T10:00:00.000Z",
				drop_ship_delivery_time: "2026-01-04T10:00:00.000Z",
				discount_for_order: "1.00",
				discounts,
				tax_amount: "1.00",
				customer,
				services,
				custom_attrs: {
					shippingTax: "0.45",
					loyaltyId: "loyalty-1",
				},
			}),
			total: undefined,
		});

		const store = makeStore(TCheckoutStep.contactInfo, {
			order: makeOrder({created_at: "2025-12-31T00:00:00.000Z"}),
		});

		const appState = await dispatchInitCheckout(store);

		expect(appState.order).toMatchObject({
			payment_method_id: "payment-method-1",
			paid_at: "2026-01-02T00:00:00.000Z",
			service_total_price: "4.00",
			total_price: "14.00",
			tip: "2.00",
			delivery_time: "2026-01-03T10:00:00.000Z",
			drop_ship_delivery_time: "2026-01-04T10:00:00.000Z",
			discount_for_order: "1.00",
			tax_amount: "1.00",
			created_at: "2025-12-31T00:00:00.000Z",
			custom_attrs: {
				shippingTax: "0.45",
				serviceRate: "0.00",
				loyaltyId: "loyalty-1",
				checkoutInited: true,
			},
		});
		expect(appState.order.discounts).toBe(discounts);
		expect(appState.order.customer).toBe(customer);
		expect(appState.order.services).toBe(services);
	});

	it("adds the delivery details step for drop-ship items and blocks payment until it is complete", async () => {
		const cart = makeCart();

		(getCartOrRetrieve as jest.Mock).mockReturnValue(cart);
		(ordersDropShippingItems as jest.Mock).mockReturnValue([cart.items[0]]);
		(getCheckoutData as jest.Mock).mockReturnValue({
			order: makeOrder({
				customer: completeCustomer(),
				services: [pickupService()],
			}),
			total: undefined,
		});

		const store = makeStore(TCheckoutStep.paymentMethod);

		const appState = await dispatchInitCheckout(store);

		expect(appState.stepper.steps).toEqual([
			TCheckoutStep.contactInfo,
			TCheckoutStep.shippingAddress,
			TCheckoutStep.deliveryDetails,
			TCheckoutStep.paymentMethod,
		]);
		expect(appState.stepper.currentStep).toBe(TCheckoutStep.deliveryDetails);
		expect(appState.stepWarning).toEqual(
			getCheckoutStepWarning(TCheckoutStep.deliveryDetails),
		);
	});

	it("calls onCheckoutInited with the initialized checkout data", async () => {
		const onCheckoutInited = jest.fn();

		(getCheckoutData as jest.Mock).mockReturnValue({
			order: makeOrder({
				customer: completeCustomer(),
				services: [pickupService()],
			}),
			total: undefined,
		});

		const store = makeStore(TCheckoutStep.paymentMethod);

		await dispatchInitCheckout(store, {onCheckoutInited});

		const appState = store.getState().app as any;

		expect(onCheckoutInited).toHaveBeenCalledTimes(1);

		const callbackData = onCheckoutInited.mock.calls[0][0];

		expect(callbackData).toMatchObject({
			items: appState.items,
			order: appState.order,
			currency: appState.currency,
			stepper: appState.stepper,
			total: appState.total,
			stepWarning: appState.stepWarning,
		});
		expect(callbackData.localeSettings.money).toMatchObject({
			decimal: ".",
			thousand: ",",
			precision: 2,
			format: "%s%v",
			symbol: "$",
		});
	});

	it("defaults a null persisted stepper to the contact step without a warning", async () => {
		(getCheckoutData as jest.Mock).mockReturnValue({
			order: makeOrder({customer: completeCustomer(), services: [pickupService()]}),
			total: undefined,
		});
		const store = makeStore(TCheckoutStep.paymentMethod, {stepper: null});

		const appState = await dispatchInitCheckout(store);

		expect(appState.stepper).toMatchObject({
			currentStep: TCheckoutStep.contactInfo,
			filledSteps: [],
			steps: [
				TCheckoutStep.contactInfo,
				TCheckoutStep.shippingAddress,
				TCheckoutStep.paymentMethod,
			],
		});
		expect(appState.stepWarning).toBeNull();
	});

	it("sets the checkout initialization error when checkout data assembly fails", async () => {
		const error = new Error("checkout data failed");
		const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

		(getCheckoutData as jest.Mock).mockImplementation(() => {
			throw error;
		});

		const store = makeStore(TCheckoutStep.contactInfo);

		const appState = await dispatchInitCheckout(store);

		expect(consoleError).toHaveBeenCalledWith(error);
		expect(appState.globalError).toBe(
			"Cannot initialize checkout. Please go back to the cart and try again.",
		);
		expect(appState.isInited).toBe(false);
		expect(appState.order).toBeUndefined();
		expect(getOrderTaxes).not.toHaveBeenCalled();

		consoleError.mockRestore();
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
