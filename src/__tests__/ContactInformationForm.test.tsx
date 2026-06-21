import React from "react";
import dayjs from "dayjs";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import ContactInformationForm from "../components/ContactInformationForm";
import {
	addFilledStep,
	setCurrentStep,
	setOrder,
	setOrdersCustomer,
	setTotal,
} from "../redux/reducers/app";
import {TCheckoutStep} from "../types/common";

(globalThis as any).React = React;

const mockDispatch = jest.fn();
let mockState: any = {};
let mockCheckoutData: any = {};
const mockSetLocalStorageCheckoutData = jest.fn();

jest.mock("../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
	useAppDispatch: () => mockDispatch,
}));

jest.mock("../hooks/checkoutData", () => ({
	getCheckoutData: () => mockCheckoutData,
	setLocalStorageCheckoutData: (data: any) =>
		mockSetLocalStorageCheckoutData(data),
}));

jest.mock("react-i18next", () => ({
	useTranslation: () => ({t: (key: string) => key}),
}));

jest.mock("../components/CheckoutStepWarning", () => () => null);
jest.mock("../components/ExtraErrors", () => () => null);

jest.mock("@mui/x-date-pickers/DatePicker", () => {
	const dayjsLib = require("dayjs");

	return {
		DatePicker: (props: any) => (
			<div>
				<input
					aria-label="contactForm.dob"
					name="dob"
					onChange={(e) => props.onChange(dayjsLib(e.target.value))}
					onBlur={() => props.onClose?.()}
				/>
				{props.slotProps?.textField?.helperText ? (
					<div>{props.slotProps.textField.helperText}</div>
				) : null}
			</div>
		),
	};
});

jest.mock("@mui/x-date-pickers/LocalizationProvider", () => ({
	LocalizationProvider: ({children}: any) => <>{children}</>,
}));

jest.mock("@mui/x-date-pickers/AdapterDayjs", () => ({AdapterDayjs: class {}}));

const staleOrder = () => ({
	id: "order-1",
	customer: {
		id: "customer-1",
		email: "jane@example.com",
		first_name: "Jane",
		last_name: "Doe",
		phone: "2505551234",
		dob: null,
		custom_attrs: {},
		addresses: [{type: "shipping", first_name: "Old", last_name: "Address"}],
	},
	services: [{service_id: 1}],
	service_total_price: "5.00",
	tax_amount: "10.00",
	total_price: "100.00",
	tip: "5.00",
	custom_attrs: {
		checkoutCompleted: true,
		shippingRate: "12.00",
		shippingTax: "1.00",
	},
});

const checkoutTotal = () => ({
	price: "100.00",
	itemsSubTotal: {price: "85.00"},
	servicesSubTotal: {price: "5.00", qty: 1},
	tax: {
		shipping: {shippingTaxes: "1.00"},
		totalTaxAmount: "10.00",
	},
});

describe("ContactInformationForm - progress invalidation on save", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockSetLocalStorageCheckoutData.mockClear();

		const order = staleOrder();
		const total = checkoutTotal();

		mockState = {
			app: {
				order,
				stepper: {
					currentStep: TCheckoutStep.contactInfo,
					steps: [
						TCheckoutStep.contactInfo,
						TCheckoutStep.shippingAddress,
						TCheckoutStep.paymentMethod,
					],
					filledSteps: [],
				},
				stepWarning: null,
			},
		};
		mockCheckoutData = {order, total};
	});

	it("clears stale services/addresses/progress and dispatches the reset order and total on save", async () => {
		render(<ContactInformationForm />);

		fireEvent.change(screen.getByLabelText("contactForm.dob"), {
			target: {value: "1990-01-01"},
		});

		fireEvent.click(
			screen.getByRole("button", {name: "contactForm.continueToShipping"}),
		);

		await waitFor(() => {
			expect(mockSetLocalStorageCheckoutData).toHaveBeenCalled();
		});

		const persisted = mockSetLocalStorageCheckoutData.mock.calls[0][0];
		expect(persisted.order.customer.addresses).toEqual([]);
		expect(persisted.order.services).toEqual([]);
		expect(persisted.order.custom_attrs.checkoutCompleted).toBeUndefined();

		expect(mockDispatch).toHaveBeenCalledWith(
			setOrdersCustomer(persisted.order.customer),
		);
		expect(mockDispatch).toHaveBeenCalledWith(setOrder(persisted.order));
		expect(mockDispatch).toHaveBeenCalledWith(setTotal(persisted.total));
		expect(mockDispatch).toHaveBeenCalledWith(
			addFilledStep({step: TCheckoutStep.contactInfo}),
		);
		expect(mockDispatch).toHaveBeenCalledWith(
			setCurrentStep(TCheckoutStep.shippingAddress),
		);
	});

	it("does not persist or dispatch checkout progress updates when contact validation fails", async () => {
		render(<ContactInformationForm />);

		fireEvent.change(screen.getByLabelText(/contactForm.email/), {
			target: {value: "not-an-email"},
		});
		fireEvent.change(screen.getByLabelText("contactForm.dob"), {
			target: {value: dayjs().subtract(18, "year").format("YYYY-MM-DD")},
		});
		fireEvent.blur(screen.getByLabelText("contactForm.dob"));

		fireEvent.submit(
			screen
				.getByRole("button", {name: "contactForm.continueToShipping"})
				.closest("form") as HTMLFormElement,
		);

		expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
		expect(
			await screen.findByText("You must be at least 19 years old"),
		).toBeInTheDocument();

		expect(mockSetLocalStorageCheckoutData).not.toHaveBeenCalled();

		const dispatchedActionTypes = mockDispatch.mock.calls.map(
			([action]) => action?.type,
		);
		[
			setOrdersCustomer.type,
			setOrder.type,
			setTotal.type,
			addFilledStep.type,
			setCurrentStep.type,
		].forEach((actionType) => {
			expect(dispatchedActionTypes).not.toContain(actionType);
		});
	});
});
