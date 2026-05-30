import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TPublishingStatus } from "boundless-api-client";
import PayHQ, { CreatePaymentInstance, PayHQHandle } from "./PayHQ";

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

function PayHQSubmitHarness({
	onPaymentApproved = jest.fn(),
	onPaymentFailed = jest.fn(),
	createPaymentInstance,
	payHQRef,
}: {
	onPaymentApproved?: (paidAt: string) => void;
	onPaymentFailed?: (message: string) => void;
	createPaymentInstance: CreatePaymentInstance;
	payHQRef?: React.Ref<PayHQHandle>;
}) {
	const internalRef = React.useRef<PayHQHandle | null>(null);
	const ref = payHQRef || internalRef;
	const [result, setResult] = React.useState<string>("");

	return (
		<>
			<PayHQ
				ref={ref}
				onPaymentApproved={onPaymentApproved}
				onPaymentFailed={onPaymentFailed}
				createPaymentInstance={createPaymentInstance}
			/>
			<button
				type="button"
				onClick={async () => {
					try {
						// Fallback if payHQRef wasn't provided but the button is clicked
						const targetRef = typeof ref === 'function' ? null : ref;
						const paymentResult = await targetRef?.current?.submitPayment();
						if (paymentResult?.paidAt) {
							setResult(paymentResult.paidAt);
						}
					} catch (e) {
						// ignore
					}
				}}
			>
				External payment submit
			</button>
			{result && <div data-testid="payment-result">{result}</div>}
		</>
	);
}

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
			json: jest.fn().mockResolvedValue({
				success: true,
				paidAt: "2026-05-23T12:00:00.000Z",
			}),
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
			<PayHQSubmitHarness
				onPaymentApproved={jest.fn()}
				onPaymentFailed={jest.fn()}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		await waitFor(() => expect(createPaymentInstance).toHaveBeenCalled());
		expect(screen.queryByRole("button", { name: /^pay$/i })).not.toBeInTheDocument();

		await user.clear(screen.getByLabelText(/first name/i));
		await user.clear(screen.getByLabelText(/last name/i));
		await user.type(screen.getByLabelText(/last name/i), "   ");
		await user.clear(screen.getByLabelText(/email/i));
		await user.click(screen.getByRole("button", { name: /external payment submit/i }));

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
			<PayHQSubmitHarness
				onPaymentApproved={jest.fn()}
				onPaymentFailed={jest.fn()}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		await waitFor(() => expect(createPaymentInstance).toHaveBeenCalled());
		expect(screen.queryByRole("button", { name: /^pay$/i })).not.toBeInTheDocument();

		const firstNameField = screen.getByLabelText(/first name/i);
		await user.clear(firstNameField);
		await user.click(screen.getByRole("button", { name: /external payment submit/i }));

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
			<PayHQSubmitHarness
				onPaymentApproved={jest.fn()}
				onPaymentFailed={jest.fn()}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		await waitFor(() => expect(createPaymentInstance).toHaveBeenCalled());
		expect(screen.queryByRole("button", { name: /^pay$/i })).not.toBeInTheDocument();

		await user.clear(screen.getByLabelText(/first name/i));
		await user.type(screen.getByLabelText(/first name/i), " Ada ");
		const emailField = screen.getByLabelText(/email/i);
		expect(emailField).toHaveValue("original@example.com");

		await user.clear(screen.getByLabelText(/last name/i));
		await user.type(screen.getByLabelText(/last name/i), " Lovelace ");
		await user.clear(emailField);
		await user.type(emailField, " ada@example.com ");
		await user.click(screen.getByRole("button", { name: /external payment submit/i }));

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

		expect(await screen.findByTestId("payment-result")).toHaveTextContent(
			"2026-05-23T12:00:00.000Z",
		);
	});

	it("prevents duplicate sale attempts if submitPayment is called again while in flight", async () => {
		let resolveToken: (val: any) => void = () => {};
		const getPaymentToken = jest.fn().mockReturnValue(
			new Promise((resolve) => {
				resolveToken = resolve;
			})
		);
		const createPaymentInstance: CreatePaymentInstance = jest.fn(() => ({
			getPaymentToken,
		}));

		const payHQRef = React.createRef<PayHQHandle>();

		render(
			<PayHQSubmitHarness
				payHQRef={payHQRef}
				onPaymentApproved={jest.fn()}
				onPaymentFailed={jest.fn()}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		await waitFor(() => expect(createPaymentInstance).toHaveBeenCalled());

		// Trigger two submissions synchronously
		let submit1: Promise<any>;
		let submit2: Promise<any>;
		act(() => {
			submit1 = payHQRef.current!.submitPayment();
			submit2 = payHQRef.current!.submitPayment();
		});

		// Second should reject immediately because first is in flight
		await expect(submit2!).rejects.toThrow("Payment is already being processed.");

		// Resolve first
		await act(async () => {
			resolveToken({ payment_token: "payment-token-1" });
			await submit1;
		});

		expect(getPaymentToken).toHaveBeenCalledTimes(1);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it("prevents duplicate sale attempts if submitPayment is called again after success", async () => {
		const getPaymentToken = jest.fn().mockResolvedValue({
			payment_token: "payment-token-1",
		});
		const createPaymentInstance: CreatePaymentInstance = jest.fn(() => ({
			getPaymentToken,
		}));

		const payHQRef = React.createRef<PayHQHandle>();

		render(
			<PayHQSubmitHarness
				payHQRef={payHQRef}
				onPaymentApproved={jest.fn()}
				onPaymentFailed={jest.fn()}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		await waitFor(() => expect(createPaymentInstance).toHaveBeenCalled());

		// First submission succeeds
		await act(async () => {
			await payHQRef.current?.submitPayment();
		});
		expect(global.fetch).toHaveBeenCalledTimes(1);

		// Second submission should fail because already approved
		let submit2: Promise<any>;
		act(() => {
			submit2 = payHQRef.current!.submitPayment();
		});
		await expect(submit2!).rejects.toThrow("Payment has already been approved.");

		// Fetch and getPaymentToken shouldn't be called again
		expect(getPaymentToken).toHaveBeenCalledTimes(1);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it("rejects and reports failure if the sale fails", async () => {
		const getPaymentToken = jest.fn().mockResolvedValue({
			payment_token: "payment-token-1",
		});
		const createPaymentInstance: CreatePaymentInstance = jest.fn(() => ({
			getPaymentToken,
		}));

		global.fetch = jest.fn().mockResolvedValue({
			ok: false,
			json: jest.fn().mockResolvedValue({
				message: "Card declined by issuer",
			}),
		});

		const onPaymentFailed = jest.fn();
		const payHQRef = React.createRef<PayHQHandle>();

		render(
			<PayHQSubmitHarness
				payHQRef={payHQRef}
				onPaymentFailed={onPaymentFailed}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		await waitFor(() => expect(createPaymentInstance).toHaveBeenCalled());

		await act(async () => {
			const submitResult = payHQRef.current!.submitPayment();
			await expect(submitResult).rejects.toThrow("Card declined by issuer");
		});
		expect(onPaymentFailed).toHaveBeenCalledWith("Card declined by issuer");
	});

	it("does not report payment failure if onPaymentApproved throws", async () => {
		const getPaymentToken = jest.fn().mockResolvedValue({
			payment_token: "payment-token-1",
		});
		const createPaymentInstance: CreatePaymentInstance = jest.fn(() => ({
			getPaymentToken,
		}));

		const onPaymentApproved = jest.fn().mockImplementation(() => {
			throw new Error("Callback error");
		});
		const onPaymentFailed = jest.fn();
		const payHQRef = React.createRef<PayHQHandle>();

		render(
			<PayHQSubmitHarness
				payHQRef={payHQRef}
				onPaymentApproved={onPaymentApproved}
				onPaymentFailed={onPaymentFailed}
				createPaymentInstance={createPaymentInstance}
			/>,
		);

		await waitFor(() => expect(createPaymentInstance).toHaveBeenCalled());

		await act(async () => {
			const submitResult = await payHQRef.current?.submitPayment();
			expect(submitResult).toEqual({ paidAt: "2026-05-23T12:00:00.000Z" });
		});

		expect(onPaymentFailed).not.toHaveBeenCalled();
		expect(onPaymentApproved).toHaveBeenCalled();
	});
});
