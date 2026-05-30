import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TPublishingStatus } from "boundless-api-client";
import PayHQ, { CreatePaymentInstance } from "./PayHQ";

let mockState: any = {};

jest.mock("../../../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock("../../../contexts/CheckoutConfigContext", () => ({
	useCheckoutConfig: () => ({
		payfirmaInfo: {
			token: "payfirma-api-key",
			environment: "TEST",
			endpoint: "",
		},
	}),
}));

jest.mock("merrco-payfirma-simple-pay-module", () => jest.fn());

const order = {
	id: "order-1",
	status_id: null,
	payment_method_id: null,
	paid_at: null,
	service_total_price: "0.00",
	payment_mark_up: null,
	total_price: "100.00",
	discount_for_order: null,
	tax_amount: "0.00",
	publishing_status: TPublishingStatus.published,
	created_at: "2026-05-23T00:00:00.000Z",
	tax_calculations: null,
	custom_attrs: {},
	customer: {
		first_name: "Original",
		last_name: "Customer",
		email: "original@example.com",
	},
} as any;

const total = {
	price: "100.00",
	itemsSubTotal: { price: "90.00", qty: 1 },
	discount: "0",
	tax: { totalTaxAmount: "10.00" },
	servicesSubTotal: { price: "0.00", qty: 0 },
} as any;

const items = [{ id: "item-1", title: "Test item" }] as any;

describe("PayHQ", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockState = {
			app: {
				order,
				items,
				total,
			},
		};
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: jest.fn().mockResolvedValue({ success: true }),
		}) as jest.Mock;
	});

	it("shows required field errors and does not request payment when contact details are empty", async () => {
		const user = userEvent.setup();
		const getPaymentToken = jest.fn().mockResolvedValue({
			payment_token: "payment-token-1",
		});
		const createPaymentInstance: CreatePaymentInstance = jest.fn(() => ({
			getPaymentToken,
		}));

		render(
			<PayHQ
				onPaymentApproved={jest.fn()}
				onPaymentFailed={jest.fn()}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		const payButton = screen.getByRole("button", { name: /pay/i });
		await waitFor(() => expect(payButton).toBeEnabled());

		await user.clear(screen.getByLabelText(/first name/i));
		await user.clear(screen.getByLabelText(/last name/i));
		await user.type(screen.getByLabelText(/last name/i), "   ");
		await user.clear(screen.getByLabelText(/email/i));
		await user.click(payButton);

		expect(await screen.findByText("First name is required")).toBeInTheDocument();
		expect(screen.getByText("Last name is required")).toBeInTheDocument();
		expect(screen.getByText("Email is required")).toBeInTheDocument();
		expect(getPaymentToken).not.toHaveBeenCalled();
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it("clears a required field error when the field receives a non-empty value", async () => {
		const user = userEvent.setup();
		const getPaymentToken = jest.fn().mockResolvedValue({
			payment_token: "payment-token-1",
		});
		const createPaymentInstance: CreatePaymentInstance = jest.fn(() => ({
			getPaymentToken,
		}));

		render(
			<PayHQ
				onPaymentApproved={jest.fn()}
				onPaymentFailed={jest.fn()}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		const payButton = screen.getByRole("button", { name: /pay/i });
		await waitFor(() => expect(payButton).toBeEnabled());

		const firstNameField = screen.getByLabelText(/first name/i);
		await user.clear(firstNameField);
		await user.click(payButton);

		expect(await screen.findByText("First name is required")).toBeInTheDocument();

		await user.type(firstNameField, "Ada");

		expect(screen.queryByText("First name is required")).not.toBeInTheDocument();
		expect(getPaymentToken).not.toHaveBeenCalled();
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it("sends the cardholder contact details to the Payfirma sale endpoint", async () => {
		const user = userEvent.setup();
		const getPaymentToken = jest.fn().mockResolvedValue({
			payment_token: "payment-token-1",
		});
		const createPaymentInstance: CreatePaymentInstance = jest.fn(() => ({
			getPaymentToken,
		}));

		render(
			<PayHQ
				onPaymentApproved={jest.fn()}
				onPaymentFailed={jest.fn()}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		const payButton = screen.getByRole("button", { name: /pay/i });
		await waitFor(() => expect(payButton).toBeEnabled());

		await user.clear(screen.getByLabelText(/first name/i));
		await user.type(screen.getByLabelText(/first name/i), " Ada ");
		const emailField = screen.getByLabelText(/email/i);
		expect(emailField).toHaveValue("original@example.com");

		await user.clear(screen.getByLabelText(/last name/i));
		await user.type(screen.getByLabelText(/last name/i), " Lovelace ");
		await user.clear(emailField);
		await user.type(emailField, " ada@example.com ");
		await user.click(payButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
			"/api/payfirmaSale",
			expect.any(Object),
		));

		const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
		const body = JSON.parse(requestInit.body);

		expect(body).toEqual(
			expect.objectContaining({
				orderId: "order-1",
				firstName: "Ada",
				lastName: "Lovelace",
				email: "ada@example.com",
				paymentToken: "payment-token-1",
				items,
				total,
			}),
		);
		expect(body.order).toEqual(expect.objectContaining({ id: "order-1" }));
	});
});
