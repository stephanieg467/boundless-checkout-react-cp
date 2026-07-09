import React from "react";
import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import ShippingForm from "./ShippingForm";
import {
	DELIVERY_COST,
	DELIVERY_ID,
	SELF_PICKUP_ID,
	SHIPPING_COST,
	SHIPPING_DELIVERY_ID,
} from "../../constants";
import {TCheckoutStep} from "../../types/common";

(globalThis as any).React = React;

const mockDispatch = jest.fn();
let mockState: any = {};
let mockCheckoutData: any = {};
const mockSetLocalStorageCheckoutData = jest.fn();

type MockDeliveryTimes = {
	isNextDay: boolean;
	times: Array<{
		label: string;
		applyDeliveryFee: boolean;
		asapDeliveryAvailable?: boolean;
	}>;
};

const defaultDeliveryTimes: MockDeliveryTimes = {
	isNextDay: false,
	times: [
		{label: "10:00 AM", applyDeliveryFee: true},
		{label: "12:00 PM", applyDeliveryFee: false},
	],
};
let mockDeliveryTimes: MockDeliveryTimes = defaultDeliveryTimes;

const setAsapDeliveryTime = (applyDeliveryFee: boolean) => {
	mockDeliveryTimes = {
		isNextDay: false,
		times: [
			{
				label: "ASAP",
				applyDeliveryFee,
				asapDeliveryAvailable: true,
			},
		],
	};
};

jest.mock("../../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
	useAppDispatch: () => mockDispatch,
}));

jest.mock("../../hooks/checkoutData", () => ({
	getCheckoutData: () => mockCheckoutData,
	setLocalStorageCheckoutData: (data: any) =>
		mockSetLocalStorageCheckoutData(data),
}));

jest.mock("react-i18next", () => ({
	useTranslation: () => ({t: (key: string) => key}),
}));

jest.mock("../../components/CheckoutStepWarning", () => () => null);

jest.mock("../../components/ExtraErrors", () => () => null);

jest.mock("../../lib/products", () => {
	const actual = jest.requireActual("../../lib/products");

	return {...actual, useCartHasTickets: () => false};
});

jest.mock("../../hooks/useDeliveryTimes", () => ({
	useDeliveryTimes: () => ({
		isLoading: false,
		isError: false,
		data: mockDeliveryTimes,
	}),
}));

jest.mock("./shippingForm/DeliverySelector", () => {
	const {useFormikContext} = require("formik");
	const {
		DELIVERY_ID: deliveryId,
		SELF_PICKUP_ID: selfPickupId,
		SHIPPING_DELIVERY_ID: shippingDeliveryId,
	} = require("../../constants");

	return function MockDeliverySelector() {
		const {values, handleChange} = useFormikContext();

		return (
			<label>
				Delivery method
				<select
					name="delivery_id"
					value={values.delivery_id}
					onChange={handleChange}
				>
					<option value={String(selfPickupId)}>Self Pickup</option>
					<option value={String(deliveryId)}>Delivery</option>
					<option value={String(shippingDeliveryId)}>Shipping</option>
				</select>
			</label>
		);
	};
});

jest.mock("./shippingForm/AddressesFields", () => {
	const {useFormikContext} = require("formik");
	const requiredAddressFields = [
		{field: "first_name", label: "first name"},
		{field: "last_name", label: "last name"},
		{field: "address_line_1", label: "address line 1"},
		{field: "zip", label: "zip"},
		{field: "city", label: "city"},
		{field: "state", label: "state"},
	];

	return function MockAddressesFields() {
		const {values, handleChange} = useFormikContext();
		const renderRequiredFields = (prefix: string, labelPrefix: string) =>
			requiredAddressFields.map(({field, label}) => {
				const id = `${prefix.replace("_address", "")}-${field.replaceAll("_", "-")}`;

				return (
					<div key={`${prefix}.${field}`}>
						<label htmlFor={id}>{`${labelPrefix} ${label}`}</label>
						<input
							id={id}
							name={`${prefix}.${field}`}
							required
							value={values[prefix]?.[field] ?? ""}
							onChange={handleChange}
						/>
					</div>
				);
			});

		return (
			<div>
				{renderRequiredFields("shipping_address", "Shipping")}
				{renderRequiredFields("billing_address", "Billing")}
			</div>
		);
	};
});

const cartItem = (isDropShip = false) => ({
	product: {
		Name: isDropShip ? "Drop-ship product" : "Regular product",
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

const staleOrder = (deliveryId = SHIPPING_DELIVERY_ID) => ({
	id: "order-1",
	tax_amount: "0",
	total_price: "10.00",
	service_total_price: "0.00",
	servicesSubTotal: {qty: 0, price: "0.00"},
	custom_attrs: {},
	customer: {
		id: "customer-1",
		email: "customer@example.com",
		first_name: "Stale",
		last_name: "Customer",
		addresses: [],
	},
	services: [{service_id: deliveryId}],
});

const checkoutTotal = (itemsSubTotalPrice = "10.00") => ({
	price: itemsSubTotalPrice,
	itemsSubTotal: {price: itemsSubTotalPrice},
	servicesSubTotal: {qty: 0, price: "0.00"},
	tax: {
		shipping: {shippingTaxes: "0"},
		totalTaxAmount: "0",
	},
});

const shippingPage = () => ({
	shippingAddress: null,
	billingAddress: {
		first_name: "Initial",
		last_name: "Billing",
		address_line_1: "1 Billing St",
		city: "Penticton",
		state: "BC",
		zip: "V2A 1A1",
		phone: "2505550000",
	},
	options: {
		country: [],
		delivery: [
			{
				delivery_id: SELF_PICKUP_ID,
				title: "Self Pickup",
				alias: "selfPickup",
				description: "Self Pickup",
			},
			{
				delivery_id: DELIVERY_ID,
				title: "Delivery",
				alias: "delivery",
				description: "Delivery",
			},
			{
				delivery_id: SHIPPING_DELIVERY_ID,
				title: "Shipping",
				alias: "shipping",
				description: "Shipping",
			},
		],
	},
});

const fillRequiredShippingAddressFields = (
	overrides: Partial<
		Record<
			"first_name" | "last_name" | "address_line_1" | "zip" | "city" | "state",
			string
		>
	> = {},
) => {
	const values = {
		first_name: "Jane",
		last_name: "Customer",
		address_line_1: "123 Main St",
		zip: "V2A 1A1",
		city: "Penticton",
		state: "BC",
		...overrides,
	};

	fireEvent.change(screen.getByLabelText("Shipping first name"), {
		target: {value: values.first_name},
	});
	fireEvent.change(screen.getByLabelText("Shipping last name"), {
		target: {value: values.last_name},
	});
	fireEvent.change(screen.getByLabelText("Shipping address line 1"), {
		target: {value: values.address_line_1},
	});
	fireEvent.change(screen.getByLabelText("Shipping zip"), {
		target: {value: values.zip},
	});
	fireEvent.change(screen.getByLabelText("Shipping city"), {
		target: {value: values.city},
	});
	fireEvent.change(screen.getByLabelText("Shipping state"), {
		target: {value: values.state},
	});
};

const continueToPayment = async () => {
	fireEvent.click(
		screen.getByRole("button", {name: "shippingForm.continueToPayment"}),
	);

	await waitFor(() => {
		expect(mockSetLocalStorageCheckoutData).toHaveBeenCalled();
	});

	return mockSetLocalStorageCheckoutData.mock.calls[0][0];
};

const expectPersistedShippingFee = (
	persisted: any,
	expectedRate: string,
	expectedTax: number,
) => {
	expect(persisted.order.service_total_price).toBe(expectedRate);
	expect(persisted.order.custom_attrs.shippingRate).toBe(expectedRate);
	expect(persisted.order.servicesSubTotal.price).toBe(expectedRate);
	expect(persisted.total.servicesSubTotal.price).toBe(expectedRate);
	expect(persisted.order.custom_attrs.shippingTax).toBe(expectedTax);
	expect(persisted.total.tax.shipping.shippingTaxes).toBe(
		expectedTax.toString(),
	);
};

describe("ShippingForm checkout address persistence", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockSetLocalStorageCheckoutData.mockClear();
		mockDeliveryTimes = defaultDeliveryTimes;

		const order = staleOrder();
		mockState = {
			app: {
				order,
				total: checkoutTotal(),
				stepper: {
					steps: [
						TCheckoutStep.contactInfo,
						TCheckoutStep.shippingAddress,
						TCheckoutStep.paymentMethod,
					],
				},
			},
		};
		mockState.app.items = [cartItem(false)];
		mockCheckoutData = {order, total: checkoutTotal()};
	});

	const setCheckoutOrder = (
		deliveryId: number,
		items = [cartItem(false)],
		{
			orderOverrides = {},
			total = mockState.app.total,
		}: {orderOverrides?: Record<string, any>; total?: any} = {},
	) => {
		const order = {...staleOrder(deliveryId), ...orderOverrides};

		mockState.app.order = order;
		mockState.app.items = items;
		mockState.app.total = total;
		mockCheckoutData = {order, total};
	};

	it("renders the delivery-time selector above address fields for Delivery with regular items", () => {
		setCheckoutOrder(DELIVERY_ID);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		const deliveryTimeSelector = screen.getByRole("combobox", {
			name: /delivery time/i,
		});
		const firstAddressField = screen.getByLabelText("Shipping first name");

		expect(deliveryTimeSelector).toBeInTheDocument();
		expect(
			deliveryTimeSelector.compareDocumentPosition(firstAddressField) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("renders an ASAP delivery-time option for Delivery with regular items", () => {
		setCheckoutOrder(DELIVERY_ID);
		setAsapDeliveryTime(true);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		const deliveryTimeSelector = screen.getByRole("combobox", {
			name: /delivery time/i,
		});

		expect(
			within(deliveryTimeSelector).getByRole("option", {name: "ASAP"}),
		).toBeInTheDocument();
	});

	it.each([
		{name: "Pickup", deliveryId: SELF_PICKUP_ID},
		{name: "Shipping", deliveryId: SHIPPING_DELIVERY_ID},
	])("does not render the delivery-time selector for $name", ({deliveryId}) => {
		setCheckoutOrder(deliveryId);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		expect(
			screen.queryByRole("combobox", {name: /delivery time/i}),
		).not.toBeInTheDocument();
	});

	it("does not render the delivery-time selector for Delivery when the cart is drop-ship-only", () => {
		setCheckoutOrder(DELIVERY_ID, [cartItem(true)]);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		expect(
			screen.queryByRole("combobox", {name: /delivery time/i}),
		).not.toBeInTheDocument();
	});

	it.each([
		{name: "Pickup", deliveryId: SELF_PICKUP_ID, items: [cartItem(false)]},
		{name: "Shipping", deliveryId: SHIPPING_DELIVERY_ID, items: [cartItem(false)]},
		{name: "drop-ship-only Delivery", deliveryId: DELIVERY_ID, items: [cartItem(true)]},
	])(
		"does not show ASAP for $name because the regular delivery-time selector is hidden",
		({deliveryId, items}) => {
			setCheckoutOrder(deliveryId, items);
			setAsapDeliveryTime(true);

			render(<ShippingForm shippingPage={shippingPage() as any} />);

			expect(
				screen.queryByRole("combobox", {name: /delivery time/i}),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("option", {name: "ASAP"}),
			).not.toBeInTheDocument();
		},
	);

	it("requires delivery_time before submitting Delivery with regular items", async () => {
		setCheckoutOrder(DELIVERY_ID);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		fillRequiredShippingAddressFields();

		const submitButton = screen.getByRole("button", {
			name: "shippingForm.continueToPayment",
		});
		const form = submitButton.closest("form");
		if (!form) throw new Error("Expected continue button to be inside a form");

		fireEvent.submit(form);

		expect(await screen.findByText("Delivery time is required")).toBeInTheDocument();
		expect(mockSetLocalStorageCheckoutData).not.toHaveBeenCalled();
	});

	it("persists order.delivery_time on successful Delivery submit", async () => {
		setCheckoutOrder(DELIVERY_ID);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		fillRequiredShippingAddressFields();
		fireEvent.change(screen.getByRole("combobox", {name: /delivery time/i}), {
			target: {value: "10:00 AM"},
		});
		const persisted = await continueToPayment();

		expect(persisted.order.delivery_time).toBe("10:00 AM");
	});

	it("persists the Delivery fee when the selected regular delivery time applies the fee", async () => {
		setCheckoutOrder(DELIVERY_ID);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		fillRequiredShippingAddressFields();
		fireEvent.change(screen.getByRole("combobox", {name: /delivery time/i}), {
			target: {value: "10:00 AM"},
		});

		const persisted = await continueToPayment();

		expectPersistedShippingFee(persisted, DELIVERY_COST, 0.2);
	});

	it("persists and prices paid ASAP Delivery like any fee-bearing delivery-time option", async () => {
		setCheckoutOrder(DELIVERY_ID);
		setAsapDeliveryTime(true);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		fillRequiredShippingAddressFields();
		fireEvent.change(screen.getByRole("combobox", {name: /delivery time/i}), {
			target: {value: "ASAP"},
		});

		const persisted = await continueToPayment();

		expect(persisted.order.delivery_time).toBe("ASAP");
		expectPersistedShippingFee(persisted, DELIVERY_COST, 0.2);
	});

	it("waives the Delivery fee for fee-free ASAP Delivery", async () => {
		setCheckoutOrder(DELIVERY_ID);
		setAsapDeliveryTime(false);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		fillRequiredShippingAddressFields();
		fireEvent.change(screen.getByRole("combobox", {name: /delivery time/i}), {
			target: {value: "ASAP"},
		});

		const persisted = await continueToPayment();

		expect(persisted.order.delivery_time).toBe("ASAP");
		expectPersistedShippingFee(persisted, "0.00", 0);
	});

	it("waives the Delivery fee when the selected regular delivery time is fee-free", async () => {
		setCheckoutOrder(DELIVERY_ID);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		fillRequiredShippingAddressFields();
		fireEvent.change(screen.getByRole("combobox", {name: /delivery time/i}), {
			target: {value: "12:00 PM"},
		});

		const persisted = await continueToPayment();

		expectPersistedShippingFee(persisted, "0.00", 0);
	});

	it("defaults to the Delivery fee when the selected regular delivery time label is unmatched", async () => {
		setCheckoutOrder(DELIVERY_ID);

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		fillRequiredShippingAddressFields();
		const deliveryTimeSelector = screen.getByRole("combobox", {
			name: /delivery time/i,
		});
		const staleOption = document.createElement("option");
		staleOption.value = "Unlisted regular time";
		deliveryTimeSelector.appendChild(staleOption);
		fireEvent.change(deliveryTimeSelector, {
			target: {value: "Unlisted regular time"},
		});

		const persisted = await continueToPayment();

		expect(persisted.order.delivery_time).toBe("Unlisted regular time");
		expectPersistedShippingFee(persisted, DELIVERY_COST, 0.2);
	});

	it("keeps Pickup free even when stale delivery-time metadata would otherwise require a fee", async () => {
		setCheckoutOrder(SELF_PICKUP_ID, [cartItem(false)], {
			orderOverrides: {delivery_time: "10:00 AM"},
		});

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		const persisted = await continueToPayment();

		expectPersistedShippingFee(persisted, "0.00", 0);
	});

	it.each([
		{
			name: "uses the Shipping fee below the free-shipping threshold",
			itemsSubTotalPrice: "10.00",
			deliveryTime: "12:00 PM",
			expectedRate: SHIPPING_COST,
			expectedTax: 0.3,
			expectedFreeShippingApplied: false,
		},
		{
			name: "keeps free Shipping above the free-shipping threshold",
			itemsSubTotalPrice: "100.00",
			deliveryTime: "10:00 AM",
			expectedRate: "0.00",
			expectedTax: 0,
			expectedFreeShippingApplied: true,
		},
	])(
		"$name and ignores delivery-time fee metadata",
		async ({
			itemsSubTotalPrice,
			deliveryTime,
			expectedRate,
			expectedTax,
			expectedFreeShippingApplied,
		}) => {
			setCheckoutOrder(SHIPPING_DELIVERY_ID, [cartItem(false)], {
				orderOverrides: {delivery_time: deliveryTime},
				total: checkoutTotal(itemsSubTotalPrice),
			});

			render(<ShippingForm shippingPage={shippingPage() as any} />);

			fillRequiredShippingAddressFields();

			const persisted = await continueToPayment();

			expectPersistedShippingFee(persisted, expectedRate, expectedTax);
			expect(persisted.order.custom_attrs.originalShippingRate).toBe(SHIPPING_COST);
			expect(persisted.order.custom_attrs.freeShippingApplied).toBe(
				expectedFreeShippingApplied,
			);
			expect(persisted.order.delivery_time).toBeUndefined();
		},
	);

	it.each([
		{
			name: "mixed cart with no drop-ship delivery time yet",
			items: [cartItem(false), cartItem(true)],
			selectedRegularTime: "12:00 PM",
		},
		{
			name: "mixed cart with an unmatched drop-ship delivery time",
			items: [cartItem(false), cartItem(true)],
			selectedRegularTime: "12:00 PM",
			dropShipDeliveryTime: "Unlisted drop-ship time",
		},
		{
			name: "drop-ship-only cart with no drop-ship delivery time yet",
			items: [cartItem(true)],
		},
	])(
		"applies the Delivery fee for a $name until Delivery Details recalculates",
		async ({items, selectedRegularTime, dropShipDeliveryTime}) => {
			setCheckoutOrder(DELIVERY_ID, items, {
				orderOverrides: {
					drop_ship_delivery_time: dropShipDeliveryTime,
				},
			});

			render(<ShippingForm shippingPage={shippingPage() as any} />);

			fillRequiredShippingAddressFields();
			if (selectedRegularTime) {
				fireEvent.change(screen.getByRole("combobox", {name: /delivery time/i}), {
					target: {value: selectedRegularTime},
				});
			}

			const persisted = await continueToPayment();

			expectPersistedShippingFee(persisted, DELIVERY_COST, 0.2);
		},
	);

	it("switches a paid shipping order to pickup and clears stale payment and shipping totals", async () => {
		const paidShippingOrder = {
			...staleOrder(),
			paid_at: "2026-05-23T12:00:00.000Z",
			payment_method_id: "5",
			paymentMethod: {payment_method_id: "5", title: "Credit Card"},
			tip: "5.00",
			delivery_time: "10:00 AM",
			service_total_price: "6.00",
			tax_amount: "0.30",
			total_price: "16.30",
			custom_attrs: {
				checkoutCompleted: true,
				shippingRate: "6.00",
				originalShippingRate: "6.00",
				shippingTax: "0.30",
				freeShippingApplied: false,
			},
			customer: {
				...staleOrder().customer,
				addresses: [{type: "shipping", first_name: "Old", last_name: "Ship"}],
			},
		} as any;
		const paidShippingTotal = {
			price: "16.30",
			itemsSubTotal: {price: "10.00"},
			servicesSubTotal: {qty: 1, price: "6.00"},
			tax: {shipping: {shippingTaxes: "0.30"}, totalTaxAmount: "0.30"},
		} as any;

		mockState.app.order = paidShippingOrder;
		mockState.app.total = paidShippingTotal;
		mockCheckoutData = {order: paidShippingOrder, total: paidShippingTotal};

		render(<ShippingForm shippingPage={shippingPage() as any} />);

		fireEvent.change(screen.getByLabelText("Delivery method"), {
			target: {value: String(SELF_PICKUP_ID)},
		});
		fireEvent.click(
			screen.getByRole("button", {name: "shippingForm.continueToPayment"}),
		);

		await waitFor(() => {
			expect(mockSetLocalStorageCheckoutData).toHaveBeenCalled();
		});

		const persisted = mockSetLocalStorageCheckoutData.mock.calls[0][0];
		expect(persisted.order.customer.addresses).toEqual([]);
		expect(persisted.order.services[0]).toEqual(
			expect.objectContaining({
				service_id: SELF_PICKUP_ID,
				is_delivery: false,
				total_price: "0.00",
			}),
		);
		expect(persisted.order.paid_at).toBeNull();
		expect(persisted.order.payment_method_id).toBeNull();
		expect(persisted.order.paymentMethod).toBeUndefined();
		expect(persisted.order.tip).toBeUndefined();
		expect(persisted.order.delivery_time).toBeUndefined();
		expect(persisted.order.custom_attrs.checkoutCompleted).toBeUndefined();
		expect(persisted.order.service_total_price).toBe("0.00");
		expect(persisted.order.custom_attrs.shippingRate).toBe("0.00");
		expect(persisted.order.custom_attrs.shippingTax).toBe(0);
		expect(persisted.total.servicesSubTotal.price).toBe("0.00");
		expect(persisted.total.tax.shipping.shippingTaxes).toBe("0");
		expect(persisted.total.tax.totalTaxAmount).toBe("0");
		expect(persisted.total.price).toBe("10.00");
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({type: "app/setOrder", payload: persisted.order}),
		);
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({type: "app/setTotal", payload: persisted.total}),
		);
	});

	it("persists submitted shipping names and keeps billing names from the billing form", async () => {
		render(<ShippingForm shippingPage={shippingPage() as any} />);

		fillRequiredShippingAddressFields({
			first_name: "Submitted",
			last_name: "Recipient",
		});
		fireEvent.change(screen.getByLabelText("Billing first name"), {
			target: {value: "Billing"},
		});
		fireEvent.change(screen.getByLabelText("Billing last name"), {
			target: {value: "Payer"},
		});

		fireEvent.click(
			screen.getByRole("button", {name: "shippingForm.continueToPayment"}),
		);

		await waitFor(() => {
			expect(mockSetLocalStorageCheckoutData).toHaveBeenCalled();
		});

		const savedOrder = mockSetLocalStorageCheckoutData.mock.calls[0][0].order;
		const shippingAddress = savedOrder.customer.addresses.find(
			(address: any) => address.type === "shipping",
		);
		const billingAddress = savedOrder.customer.addresses.find(
			(address: any) => address.type === "billing",
		);

		expect(billingAddress).toEqual(
			expect.objectContaining({
				first_name: "Billing",
				last_name: "Payer",
			}),
		);
		expect(shippingAddress).toEqual(
			expect.objectContaining({
				first_name: "Submitted",
				last_name: "Recipient",
			}),
		);
		expect(shippingAddress).not.toHaveProperty("phone");
		expect(billingAddress).not.toHaveProperty("phone");
	});
});
