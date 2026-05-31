import React from "react";
import {render, screen} from "@testing-library/react";
import {ITotal, TPublishingStatus} from "boundless-api-client";
import CartFooter from "../components/cart/CartFooter";
import {IOrderWithCustmAttr} from "../types/Order";
import {getCheckoutData} from "../hooks/checkoutData";
import {getCartOrRetrieve} from "../hooks/getCartOrRetrieve";

let mockState: any = {};

jest.mock("../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock("../hooks/checkoutData", () => ({
	getCheckoutData: jest.fn(),
}));

jest.mock("../hooks/getCartOrRetrieve", () => ({
	getCartOrRetrieve: jest.fn(),
}));

const makeOrder = (
	overrides: Partial<IOrderWithCustmAttr> = {},
): IOrderWithCustmAttr => ({
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
	tip: "0.00",
	...overrides,
});

const makeTotal = (overrides: Partial<ITotal> = {}): ITotal => ({
	price: "100.00",
	itemsSubTotal: {price: "90.00", qty: 1},
	discount: "0",
	tax: {totalTaxAmount: "10.00"} as any,
	servicesSubTotal: {price: "0.00", qty: 0},
	...overrides,
} as unknown as ITotal);

const setReduxCheckoutState = (
	overrides: {
		order?: Partial<IOrderWithCustmAttr>;
		total?: Partial<ITotal>;
	} = {},
) => {
	mockState = {
		app: {
			order: makeOrder(overrides.order),
			total: makeTotal(overrides.total),
			localeSettings: undefined,
		},
	};
};

describe("CartFooter", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(getCheckoutData as jest.Mock).mockReturnValue(null);
		(getCartOrRetrieve as jest.Mock).mockReturnValue(null);
		setReduxCheckoutState();
	});

	it("does not render a tip row when there is no positive tip", () => {
		render(<CartFooter open />);

		expect(screen.queryByText("Tip:")).not.toBeInTheDocument();
		expect(screen.getByText("$100.00")).toBeInTheDocument();
	});

	it("renders a tip row when the order has a positive tip", () => {
		setReduxCheckoutState({
			order: {tip: "5", total_price: "105.00"},
			total: {price: "105.00"},
		});

		render(<CartFooter open />);

		expect(screen.getByText("Tip:")).toBeInTheDocument();
		expect(screen.getByText("$5.00")).toBeInTheDocument();
		expect(screen.getByText("$105.00")).toBeInTheDocument();
	});

	it("updates the displayed total from Redux after payment approval adds a tip", () => {
		const {rerender} = render(<CartFooter open />);

		expect(screen.queryByText("Tip:")).not.toBeInTheDocument();
		expect(screen.getByText("$100.00")).toBeInTheDocument();

		setReduxCheckoutState({
			order: {
				paid_at: "2026-05-23T12:00:00.000Z",
				tip: "5",
				total_price: "105.00",
			},
			total: {price: "105.00"},
		});

		rerender(<CartFooter open />);

		expect(screen.getByText("Tip:")).toBeInTheDocument();
		expect(screen.getByText("$5.00")).toBeInTheDocument();
		expect(screen.getByText("$105.00")).toBeInTheDocument();
	});

	it("ignores negative tip values for total calculations", () => {
		setReduxCheckoutState({
			order: {tip: "-5.00"},
			total: {
				price: undefined,
				itemsSubTotal: {price: "90.00", qty: 1},
				servicesSubTotal: {price: "0.00", qty: 0},
				tax: {totalTaxAmount: "10.00"} as any,
			},
		});

		render(<CartFooter open />);

		expect(screen.queryByText("Tip:")).not.toBeInTheDocument();
		expect(screen.getByText("$100.00")).toBeInTheDocument(); // fallback total: 90 + 0 + 10 + 0 (tip is clamped)
	});
});
