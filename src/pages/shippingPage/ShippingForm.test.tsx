import React from "react";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import ShippingForm from "./ShippingForm";
import {SHIPPING_DELIVERY_ID} from "../../constants";
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

jest.mock("./shippingForm/DeliverySelector", () => () => (
	<div data-testid="delivery-selector" />
));

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
