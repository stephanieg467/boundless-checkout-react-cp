import React from "react";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import CartDiscountForm from "./CartDiscountForm";
import {setOrder, setTotal} from "../../redux/reducers/app";

(globalThis as any).React = React;

const mockDispatch = jest.fn();
const mockSetCart = jest.fn();
const mockSetLocalStorageCheckoutData = jest.fn();
const mockGetOrderTaxes = jest.fn();
let mockCart: any;
let mockCheckoutData: any;
let mockCoupons: any[];

jest.mock("../../hooks/redux", () => ({
	useAppDispatch: () => mockDispatch,
}));

jest.mock("../../hooks/getCartOrRetrieve", () => ({
	getCartOrRetrieve: () => mockCart,
	setCart: (cart: any) => mockSetCart(cart),
}));

jest.mock("../../hooks/checkoutData", () => ({
	getCheckoutData: () => mockCheckoutData,
	setLocalStorageCheckoutData: (data: any) =>
		mockSetLocalStorageCheckoutData(data),
}));

jest.mock("../../hooks/useCustomer", () => ({
	useCustomer: () => ({customer: {}, isSuccess: true}),
}));

jest.mock("@tanstack/react-query", () => ({
	useQuery: () => ({data: mockCoupons, isSuccess: true, isError: false}),
}));

jest.mock("../../lib/taxes", () => ({
	getOrderTaxes: (items: any[]) => mockGetOrderTaxes(items),
}));

jest.mock("react-i18next", () => ({
	useTranslation: () => ({t: (key: string) => key}),
}));

const item = (ProductId: string, price: number, qty = 1) => ({
	product: {
		ProductId,
		Prices: [{Price: price}],
		ProductSpecifications: [],
	},
	qty,
	total: (price * qty).toFixed(2),
});

const submitCoupon = async () => {
	fireEvent.change(screen.getByRole("textbox"), {
		target: {value: "SAVE20"},
	});
	fireEvent.click(
		screen.getByRole("button", {name: "cart.discountForm.apply"}),
	);
};

describe("CartDiscountForm", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCoupons = [{code: "SAVE20", type: "Percent", value: "20"}];
		mockGetOrderTaxes.mockResolvedValue("4.16");

		const originalCart = {
			id: "original-cart",
			total: {total: "103.97"},
			items: [item("A", 32.54), item("B", 34.92), item("C", 36.51)],
		};
		mockCart = {
			id: "current-cart",
			total: {total: "3.00"},
			items: [item("A", 1), item("B", 1), item("C", 1)],
		};
		mockCheckoutData = {
			order: {
				id: "order-1",
				tax_calculations: {itemsSubTotal: {}, tax: {}},
				custom_attrs: {
					originalCart,
					originalSubTotalPrice: "103.97",
				},
			},
			total: {
				price: "3.30",
				itemsSubTotal: {price: "3.00"},
				discount: "0.00",
				tax: {
					shipping: {shippingTaxes: "0.30"},
					totalTaxAmount: "0.30",
				},
			},
		};
	});

	it("persists one allocation from the first original cart snapshot", async () => {
		render(<CartDiscountForm />);
		await submitCoupon();

		await waitFor(() => {
			expect(mockSetLocalStorageCheckoutData).toHaveBeenCalledTimes(1);
		});

		const allocatedItems = mockGetOrderTaxes.mock.calls[0][0];
		expect(allocatedItems.map((cartItem: any) => cartItem.total)).toEqual([
			"26.03",
			"27.94",
			"29.21",
		]);
		expect(allocatedItems.map((cartItem: any) => cartItem.product.couponPrice)).toEqual([
			"26.03",
			"27.94",
			"29.21",
		]);

		const persistedCart = mockSetCart.mock.calls[0][0];
		expect(persistedCart).toMatchObject({
			id: "current-cart",
			total: {total: "83.18"},
			taxAmount: 4.46,
			items: allocatedItems,
		});

		const persisted = mockSetLocalStorageCheckoutData.mock.calls[0][0];
		expect(persisted.order).toMatchObject({
			discount_for_order: "20.79",
			total_price: "87.64",
			tax_amount: "4.46",
			tax_calculations: {
				itemsSubTotal: {price: "83.18"},
				discount: "20.79",
			},
			custom_attrs: {
				originalCart: mockCheckoutData.order.custom_attrs.originalCart,
				originalSubTotalPrice: "103.97",
			},
		});
		expect(persisted.total).toMatchObject({
			price: "87.64",
			itemsSubTotal: {price: "83.18"},
			discount: "20.79",
		});
		expect(mockSetCart.mock.invocationCallOrder[0]).toBeLessThan(
			mockSetLocalStorageCheckoutData.mock.invocationCallOrder[0],
		);
		expect(mockDispatch).toHaveBeenCalledWith(setOrder(persisted.order));
		expect(mockDispatch).toHaveBeenCalledWith(setTotal(persisted.total));
	});

	it("passes a fully discounted line as zero to tax calculation and storage", async () => {
		mockCoupons = [{code: "SAVE20", type: "Fixed", value: "40"}];
		mockCart.items = [item("A", 10, 3)];
		mockCart.total.total = "30.00";
		mockCheckoutData.order.custom_attrs = {};
		mockCheckoutData.total.itemsSubTotal.price = "30.00";
		mockGetOrderTaxes.mockResolvedValue("0.00");

		render(<CartDiscountForm />);
		await submitCoupon();

		await waitFor(() => expect(mockSetLocalStorageCheckoutData).toHaveBeenCalledTimes(1));
		expect(mockGetOrderTaxes.mock.calls[0][0][0]).toMatchObject({
			qty: 3,
			total: "0.00",
			product: {couponPrice: "0"},
		});
		expect(mockSetCart.mock.calls[0][0].items[0].total).toBe("0.00");
		expect(mockSetLocalStorageCheckoutData.mock.calls[0][0]).toMatchObject({
			order: {
				discount_for_order: "30.00",
				custom_attrs: {originalSubTotalPrice: "30.00"},
			},
			total: {itemsSubTotal: {price: "0.00"}},
		});
	});

	it("shows a form error and performs no writes for invalid allocation input", async () => {
		mockCheckoutData.order.custom_attrs = {};
		mockCart.items[1].qty = 0;
		render(<CartDiscountForm />);
		await submitCoupon();

		expect(await screen.findByText("Unable to apply coupon")).toBeInTheDocument();
		expect(mockGetOrderTaxes).not.toHaveBeenCalled();
		expect(mockSetCart).not.toHaveBeenCalled();
		expect(mockSetLocalStorageCheckoutData).not.toHaveBeenCalled();
		expect(mockDispatch).not.toHaveBeenCalled();
	});
});
