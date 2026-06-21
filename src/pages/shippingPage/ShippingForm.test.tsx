import React from "react";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import ShippingForm from "./ShippingForm";
import {SELF_PICKUP_ID, SHIPPING_DELIVERY_ID} from "../../constants";
import {TCheckoutStep} from "../../types/common";

(globalThis as any).React = React;

const mockDispatch = jest.fn();
let mockState: any = {};
let mockCheckoutData: any = {};
const mockSetLocalStorageCheckoutData = jest.fn();

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

jest.mock("../../lib/products", () => ({useCartHasTickets: () => false}));

jest.mock("./shippingForm/DeliverySelector", () => {
	const {useFormikContext} = require("formik");
	const {
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
					<option value={String(shippingDeliveryId)}>Shipping</option>
				</select>
			</label>
		);
	};
});

jest.mock("./shippingForm/AddressesFields", () => {
	const {useFormikContext} = require("formik");

	return function MockAddressesFields() {
		const {values, handleChange} = useFormikContext();

		return (
			<div>
				<label htmlFor="shipping-first-name">Shipping first name</label>
				<input
					id="shipping-first-name"
					name="shipping_address.first_name"
					value={values.shipping_address?.first_name ?? ""}
					onChange={handleChange}
				/>
				<label htmlFor="shipping-last-name">Shipping last name</label>
				<input
					id="shipping-last-name"
					name="shipping_address.last_name"
					value={values.shipping_address?.last_name ?? ""}
					onChange={handleChange}
				/>
				<label htmlFor="billing-first-name">Billing first name</label>
				<input
					id="billing-first-name"
					name="billing_address.first_name"
					value={values.billing_address?.first_name ?? ""}
					onChange={handleChange}
				/>
				<label htmlFor="billing-last-name">Billing last name</label>
				<input
					id="billing-last-name"
					name="billing_address.last_name"
					value={values.billing_address?.last_name ?? ""}
					onChange={handleChange}
				/>
			</div>
		);
	};
});

const staleOrder = () => ({
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
	services: [{service_id: SHIPPING_DELIVERY_ID}],
});

const checkoutTotal = () => ({
	price: "10.00",
	itemsSubTotal: {price: "10.00"},
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
				delivery_id: SHIPPING_DELIVERY_ID,
				title: "Shipping",
				alias: "shipping",
				description: "Shipping",
			},
		],
	},
});

describe("ShippingForm checkout address persistence", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockSetLocalStorageCheckoutData.mockClear();

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
		mockCheckoutData = {order, total: checkoutTotal()};
	});

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

		fireEvent.change(screen.getByLabelText("Shipping first name"), {
			target: {value: "Submitted"},
		});
		fireEvent.change(screen.getByLabelText("Shipping last name"), {
			target: {value: "Recipient"},
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
	});
});
