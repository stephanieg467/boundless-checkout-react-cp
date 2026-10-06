import React from "react";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import DeliveryDetailsForm from "./DeliveryDetailsForm";
import {
	DELIVERY_ID,
	SHIPPING_COST,
	SHIPPING_DELIVERY_ID,
} from "../../constants";
import {TCheckoutStep} from "../../types/common";

(globalThis as any).React = React;

const mockDispatch = jest.fn();
const mockSetLocalStorageCheckoutData = jest.fn();
let mockState: any = {};
let mockCheckoutData: any = {};

jest.mock("../../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
	useAppDispatch: () => mockDispatch,
}));

jest.mock("../../hooks/checkoutData", () => ({
	getCheckoutData: () => mockCheckoutData,
	setLocalStorageCheckoutData: (data: any) =>
		mockSetLocalStorageCheckoutData(data),
}));

const regularAsapFeeFree = {label: "ASAP", applyDeliveryFee: false};
const regularFeeRequired = {label: "Regular fee slot", applyDeliveryFee: true};
const regularFeeFree = {label: "Regular free slot", applyDeliveryFee: false};
const dropShipFeeRequired = {
	label: "Drop-ship fee slot",
	applyDeliveryFee: true,
};
const dropShipFeeFree = {
	label: "Drop-ship free slot",
	applyDeliveryFee: false,
};

jest.mock("../../hooks/useDeliveryTimes", () => ({
	useDeliveryTimes: () => ({
		isLoading: false,
		isError: false,
		data: {
			isNextDay: false,
			times: [regularAsapFeeFree, regularFeeRequired, regularFeeFree],
			dropShipTimes: {
				date: "Friday, July 10",
				times: [dropShipFeeRequired, dropShipFeeFree],
			},
		},
	}),
}));

jest.mock("../../components/CheckoutStepWarning", () => () => null);
jest.mock("../../components/ExtraErrors", () => () => null);

const cartItem = (name: string, isDropShip: boolean) => ({
	product: {
		Name: name,
		ClassificationName: "Flower",
		ProductSpecifications: [
			{
				DisplayName: "Is Drop Shipping Inventory",
				Unit: "",
				Value: isDropShip ? "Yes" : "No",
			},
		],
	},
});

const regularItem = cartItem("Regular product", false);
const dropShipItem = cartItem("Drop-ship product", true);

const quotedFee = "6.00";

const checkoutTotalsForRate = (shippingRate: string) => {
	const shippingTax = Math.round(Number(shippingRate) * 0.05 * 100) / 100;
	const totalTax = 1 + shippingTax;

	return {
		price: (10 + totalTax + Number(shippingRate)).toFixed(2),
		itemsSubTotal: {price: "10.00", qty: 1},
		servicesSubTotal: {price: shippingRate, qty: 1},
		tax: {
			shipping: {shippingTaxes: shippingTax.toString()},
			totalTaxAmount: totalTax.toString(),
		},
	};
};

const checkoutService = (
	deliveryId: number,
	shippingRate: string,
	title: string,
) => ({
	service_id: deliveryId,
	qty: 1,
	total_price: shippingRate,
	is_delivery: true,
	serviceDelivery: {
		delivery_id: deliveryId,
		title,
		delivery: {title},
	},
});

const deliveryService = (shippingRate: string) =>
	checkoutService(DELIVERY_ID, shippingRate, "Delivery");

const shippingService = (shippingRate: string) =>
	checkoutService(SHIPPING_DELIVERY_ID, shippingRate, "Shipping");

const makeOrder = ({
	shippingRate,
	overrides = {},
}: {
	shippingRate: string;
	overrides?: Record<string, any>;
}) => {
	const total = checkoutTotalsForRate(shippingRate);
	const shippingTax = Math.round(Number(shippingRate) * 0.05 * 100) / 100;

	return {
		id: "order-1",
		tax_amount: total.tax.totalTaxAmount,
		total_price: total.price,
		service_total_price: shippingRate,
		servicesSubTotal: total.servicesSubTotal,
		custom_attrs: {
			shippingRate,
			originalShippingRate: quotedFee,
			shippingTax,
			freeShippingApplied: shippingRate === "0.00",
			deliveryQuote: {fee: quotedFee, zoneLabel: "15–30 km", quotedAt: Date.now()},
		},
		customer: {id: "customer-1", email: "customer@example.com"},
		services: [deliveryService(shippingRate)],
		...overrides,
	};
};

const setup = ({
	items = [dropShipItem],
	orderOverrides = {},
	staleShippingRate = quotedFee,
	totalOverride,
}: {
	items?: any[];
	orderOverrides?: Record<string, any>;
	staleShippingRate?: string;
	totalOverride?: any;
} = {}) => {
	const total = totalOverride ?? checkoutTotalsForRate(staleShippingRate);
	const order = makeOrder({
		shippingRate: staleShippingRate,
		overrides: orderOverrides,
	});

	mockState = {
		app: {
			order,
			total,
			items,
			stepper: {
				currentStep: TCheckoutStep.deliveryDetails,
				steps: [
					TCheckoutStep.contactInfo,
					TCheckoutStep.shippingAddress,
					TCheckoutStep.deliveryDetails,
					TCheckoutStep.paymentMethod,
				],
				filledSteps: [TCheckoutStep.contactInfo, TCheckoutStep.shippingAddress],
			},
			stepWarning: null,
		},
	};
	mockCheckoutData = {order, total, items};

	return render(<DeliveryDetailsForm />);
};

const selectDropShipTime = (label: string) => {
	const dropShipSelector = screen
		.getAllByRole("combobox", {name: /delivery time/i})
		.find((selector) =>
			Array.from((selector as HTMLSelectElement).options).some(
				(option) => option.value === label,
			),
		);

	if (!dropShipSelector) {
		throw new Error(`Expected a drop-ship selector with option ${label}`);
	}

	fireEvent.change(dropShipSelector, {target: {value: label}});
};

const submitDeliveryDetails = async () => {
	fireEvent.click(screen.getByRole("button", {name: /continue to payment/i}));

	await waitFor(() => {
		expect(mockSetLocalStorageCheckoutData).toHaveBeenCalled();
	});

	return mockSetLocalStorageCheckoutData.mock.calls.at(-1)[0];
};

const expectPersistedDeliveryTotals = ({
	persisted,
	expectedRate,
	expectedShippingTax,
	expectedTotalPrice,
}: {
	persisted: any;
	expectedRate: string;
	expectedShippingTax: number;
	expectedTotalPrice: string;
}) => {
	expect(persisted.order.service_total_price).toBe(expectedRate);
	expect(persisted.order.servicesSubTotal.price).toBe(expectedRate);
	expect(persisted.order.services).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				service_id: DELIVERY_ID,
				total_price: expectedRate,
			}),
		]),
	);
	expect(persisted.order.custom_attrs.shippingRate).toBe(expectedRate);
	expect(persisted.order.custom_attrs.originalShippingRate).toBe(quotedFee);
	expect(persisted.order.custom_attrs.shippingTax).toBe(expectedShippingTax);
	expect(persisted.order.custom_attrs.freeShippingApplied).toBe(expectedRate === "0.00");
	expect(persisted.order.custom_attrs.deliveryQuote).toEqual(mockCheckoutData.order.custom_attrs.deliveryQuote);
	expect(persisted.total.servicesSubTotal.price).toBe(expectedRate);
	expect(persisted.total.tax.shipping.shippingTaxes).toBe(
		expectedShippingTax.toString(),
	);
	expect(Number(persisted.order.tax_amount)).toBeCloseTo(
		1 + expectedShippingTax,
	);
	expect(Number(persisted.total.tax.totalTaxAmount)).toBeCloseTo(
		1 + expectedShippingTax,
	);
	expect(persisted.order.total_price).toBe(expectedTotalPrice);
	expect(persisted.total.price).toBe(expectedTotalPrice);
};

describe("DeliveryDetailsForm drop-ship delivery details", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockSetLocalStorageCheckoutData.mockClear();
	});

	it("renders only the drop-ship selector for mixed Delivery carts", () => {
		setup({
			items: [regularItem, dropShipItem],
			orderOverrides: {delivery_time: regularFeeFree.label},
		});

		const selectors = screen.getAllByRole("combobox", {
			name: /delivery time/i,
		});

		expect(selectors).toHaveLength(1);
		expect(selectors[0]).toHaveTextContent(dropShipFeeRequired.label);
		expect(selectors[0]).toHaveTextContent(dropShipFeeFree.label);
		expect(selectors[0]).not.toHaveTextContent(regularAsapFeeFree.label);
		expect(selectors[0]).not.toHaveTextContent(regularFeeRequired.label);
		expect(screen.getByText("Drop-ship product")).toBeInTheDocument();
		expect(screen.queryByText("Regular product")).not.toBeInTheDocument();
	});

	it("shows the quoted zone fee on paid slots and keeps free slots free", () => {
		setup();

		expect(screen.getByText("Delivery zone: 15–30 km")).toBeInTheDocument();
		expect(screen.getByRole("option", {
			name: "Drop-ship fee slot — $6.00 delivery fee",
		})).toHaveValue(dropShipFeeRequired.label);
		expect(screen.getByRole("option", {
			name: "Drop-ship free slot — Free delivery",
		})).toHaveValue(dropShipFeeFree.label);
	});

	it.each([
		{
			selectedSlot: dropShipFeeFree.label,
			staleShippingRate: quotedFee,
			expectedRate: "0.00",
			expectedShippingTax: 0,
			expectedTotalPrice: "11.00",
		},
		{
			selectedSlot: dropShipFeeRequired.label,
			staleShippingRate: "0.00",
			expectedRate: quotedFee,
			expectedShippingTax: 0.3,
			expectedTotalPrice: "17.30",
		},
	])(
		"saves drop_ship_delivery_time and recalculates drop-ship-only Delivery totals for $selectedSlot",
		async ({
			selectedSlot,
			staleShippingRate,
			expectedRate,
			expectedShippingTax,
			expectedTotalPrice,
		}) => {
			setup({staleShippingRate});

			selectDropShipTime(selectedSlot);

			const persisted = await submitDeliveryDetails();

			expect(persisted.order.drop_ship_delivery_time).toBe(selectedSlot);
			expectPersistedDeliveryTotals({
				persisted,
				expectedRate,
				expectedShippingTax,
				expectedTotalPrice,
			});
		},
	);

	it.each([
		{itemsSubtotal: "99.99", expectedRate: quotedFee, expectedShippingTax: 0.3, expectedTotalPrice: "107.29"},
		{itemsSubtotal: "100.00", expectedRate: "0.00", expectedShippingTax: 0, expectedTotalPrice: "101.00"},
	])("keeps the subtotal waiver consistent after selecting paid slots at $itemsSubtotal", async ({
		itemsSubtotal, expectedRate, expectedShippingTax, expectedTotalPrice,
	}) => {
		const shippingStepTotal = checkoutTotalsForRate(expectedRate);
		setup({
			items: [regularItem, dropShipItem],
			staleShippingRate: expectedRate,
			orderOverrides: {delivery_time: regularFeeRequired.label, total_price: expectedTotalPrice},
			totalOverride: {
				...shippingStepTotal,
				price: expectedTotalPrice,
				itemsSubTotal: {price: itemsSubtotal, qty: 2},
			},
		});

		selectDropShipTime(dropShipFeeRequired.label);
		const persisted = await submitDeliveryDetails();

		expectPersistedDeliveryTotals({persisted, expectedRate, expectedShippingTax, expectedTotalPrice});
	});

	it("does not recalculate local Delivery fees for Shipping orders", async () => {
		const shippingTotal = {
			price: "16.30",
			itemsSubTotal: {price: "10.00", qty: 1},
			servicesSubTotal: {price: SHIPPING_COST, qty: 1},
			tax: {
				shipping: {shippingTaxes: "0.3"},
				totalTaxAmount: "0.3",
			},
		};
		setup({
			items: [regularItem, dropShipItem],
			staleShippingRate: SHIPPING_COST,
			totalOverride: shippingTotal,
			orderOverrides: {
				delivery_time: regularFeeRequired.label,
				drop_ship_delivery_time: dropShipFeeRequired.label,
				services: [shippingService(SHIPPING_COST)],
				service_total_price: SHIPPING_COST,
				servicesSubTotal: shippingTotal.servicesSubTotal,
				tax_amount: shippingTotal.tax.totalTaxAmount,
				total_price: shippingTotal.price,
				custom_attrs: {
					shippingRate: SHIPPING_COST,
					originalShippingRate: SHIPPING_COST,
					shippingTax: 0.3,
					freeShippingApplied: false,
				},
			},
		});
		expect(screen.queryByText(/Delivery zone:/)).not.toBeInTheDocument();
		const originalOrder = mockCheckoutData.order;
		const originalTotal = mockCheckoutData.total;

		const persisted = await submitDeliveryDetails();

		expect(persisted.order.service_total_price).toBe(
			originalOrder.service_total_price,
		);
		expect(persisted.order.servicesSubTotal).toEqual(
			originalOrder.servicesSubTotal,
		);
		expect(persisted.order.custom_attrs).toEqual(originalOrder.custom_attrs);
		expect(persisted.order.tax_amount).toBe(originalOrder.tax_amount);
		expect(persisted.order.total_price).toBe(originalOrder.total_price);
		expect(persisted.total.servicesSubTotal).toEqual(
			originalTotal.servicesSubTotal,
		);
		expect(persisted.total.tax).toEqual(originalTotal.tax);
		expect(persisted.total.price).toBe(originalTotal.price);
		expect(persisted.order.services).toEqual([
			expect.objectContaining({
				service_id: SHIPPING_DELIVERY_ID,
				total_price: SHIPPING_COST,
			}),
		]);
		expect(persisted.order.services).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({service_id: DELIVERY_ID}),
			]),
		);
	});

	it.each([
		{
			regularSlot: regularFeeRequired.label,
			dropShipSlot: dropShipFeeFree.label,
			expectedRate: quotedFee,
			expectedShippingTax: 0.3,
			expectedTotalPrice: "17.30",
		},
		{
			regularSlot: regularFeeFree.label,
			dropShipSlot: dropShipFeeRequired.label,
			expectedRate: quotedFee,
			expectedShippingTax: 0.3,
			expectedTotalPrice: "17.30",
		},
		{
			regularSlot: regularFeeRequired.label,
			dropShipSlot: dropShipFeeRequired.label,
			expectedRate: quotedFee,
			expectedShippingTax: 0.3,
			expectedTotalPrice: "17.30",
		},
		{
			regularSlot: regularFeeFree.label,
			dropShipSlot: dropShipFeeFree.label,
			expectedRate: "0.00",
			expectedShippingTax: 0,
			expectedTotalPrice: "11.00",
		},
		{
			regularSlot: regularAsapFeeFree.label,
			dropShipSlot: dropShipFeeFree.label,
			expectedRate: "0.00",
			expectedShippingTax: 0,
			expectedTotalPrice: "11.00",
		},
	])(
		"recalculates mixed Delivery totals from the Shipping regular slot and Delivery Details drop-ship slot ($regularSlot / $dropShipSlot)",
		async ({
			regularSlot,
			dropShipSlot,
			expectedRate,
			expectedShippingTax,
			expectedTotalPrice,
		}) => {
			setup({
				items: [regularItem, dropShipItem],
				orderOverrides: {delivery_time: regularSlot},
				staleShippingRate: expectedRate === quotedFee ? "0.00" : quotedFee,
			});

			selectDropShipTime(dropShipSlot);

			const persisted = await submitDeliveryDetails();

			expect(persisted.order.delivery_time).toBe(regularSlot);
			expect(persisted.order.drop_ship_delivery_time).toBe(dropShipSlot);
			expectPersistedDeliveryTotals({
				persisted,
				expectedRate,
				expectedShippingTax,
				expectedTotalPrice,
			});
		},
	);
});
