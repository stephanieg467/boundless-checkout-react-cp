import {CleanedCovaProduct, Coupon, CovaCartItem} from "../types/cart";
import {allocateCouponDiscount} from "./couponDiscount";

const product = (
	ProductId: string,
	price: number,
	discountedPrice?: string,
): CleanedCovaProduct =>
	({
		ProductId,
		Prices: [{Price: price}],
		discountedPrice,
	} as CleanedCovaProduct);

const item = (
	ProductId: string,
	price: number,
	qty = 1,
	overrides: Partial<CovaCartItem> = {},
): CovaCartItem => ({
	product: product(ProductId, price),
	qty,
	total: (price * qty).toFixed(2),
	...overrides,
});

const coupon = (value: string, type = "Fixed"): Coupon => ({
	code: "SAVE",
	type,
	value,
});

const totalsByProduct = (items: CovaCartItem[]) =>
	Object.fromEntries(items.map(({product, total}) => [product.ProductId, total]));

describe("allocateCouponDiscount", () => {
	it("allocates the three-product percentage example in integer cents", () => {
		const result = allocateCouponDiscount(
			[item("A", 32.54), item("B", 34.92), item("C", 36.51)],
			coupon("20", "Percent"),
		);

		expect(result.items.map(({total}) => total)).toEqual([
			"26.03",
			"27.94",
			"29.21",
		]);
		expect(result.discountAmount).toBe("20.79");
		expect(result.merchandiseSubtotal).toBe("83.18");
		expect(
			result.items.reduce((sum, cartItem) => sum + Number(cartItem.total), 0),
		).toBeCloseTo(83.18);
	});

	it.each<[string, CovaCartItem[], string, string[], string, string]>([
		["15 cents at 3.3%", [item("A", 0.15)], "3.3", ["0.15"], "0.00", "0.15"],
		["10.00 at 3.0495%", [item("A", 10)], "3.0495", ["9.70"], "0.30", "9.70"],
		["55.00 at 0.7% (38.4999… float noise)", [item("A", 55)], "0.7", ["54.61"], "0.39", "54.61"],
		["50.00 at 1.13% (56.4999… float noise)", [item("A", 50)], "1.13", ["49.43"], "0.57", "49.43"],
		["27.32 at 0.0183% (0.499956 cents)", [item("A", 27.32)], "0.0183", ["27.32"], "0.00", "27.32"],
		[
			"10.00 at 3.05% rounding the half cent up",
			[item("A", 6), item("B", 4)],
			"3.05",
			["5.81", "3.88"],
			"0.31",
			"9.69",
		],
	])(
		"rounds a fractional percentage once for %s",
		(_label, items, percent, totals, discount, subtotal) => {
			const result = allocateCouponDiscount(items, coupon(percent, "Percent"));

			expect(result.items.map(({total}) => total)).toEqual(totals);
			expect(result.discountAmount).toBe(discount);
			expect(result.merchandiseSubtotal).toBe(subtotal);
		},
	);

	it("allocates a fixed coupon proportionally", () => {
		const result = allocateCouponDiscount(
			[item("A", 10), item("B", 20)],
			coupon("3.00"),
		);

		expect(result.items.map(({total}) => total)).toEqual(["9.00", "18.00"]);
		expect(result.discountAmount).toBe("3.00");
		expect(result.merchandiseSubtotal).toBe("27.00");
	});

	it("excludes promotion lines and leaves them unchanged", () => {
		const promotion = item("PROMO", 8, 1, {
			product: product("PROMO", 8, "5.00"),
			total: "5.00",
		});
		const result = allocateCouponDiscount(
			[item("REGULAR", 10), promotion],
			coupon("50", "Percent"),
		);

		expect(result.items[0].total).toBe("5.00");
		expect(result.items[0].product.couponPrice).toBe("5");
		expect(result.items[1]).toEqual(promotion);
		expect(result.discountAmount).toBe("5.00");
		expect(result.merchandiseSubtotal).toBe("10.00");
	});

	it("handles a zero eligible subtotal without dividing", () => {
		const result = allocateCouponDiscount(
			[item("FREE", 0)],
			coupon("5.00"),
		);

		expect(result.items[0].total).toBe("0.00");
		expect(result.items[0].product.couponPrice).toBe("0");
		expect(result.discountAmount).toBe("0.00");
		expect(result.merchandiseSubtotal).toBe("0.00");
	});

	it.each([
		["a fixed coupon above the subtotal", coupon("20.00")],
		["a 100% coupon", coupon("100", "Percent")],
	])("caps %s without producing negative lines", (_label, appliedCoupon) => {
		const result = allocateCouponDiscount(
			[item("A", 4), item("B", 6)],
			appliedCoupon,
		);

		expect(result.items.map(({total}) => total)).toEqual(["0.00", "0.00"]);
		expect(result.items.map(({product}) => product.couponPrice)).toEqual([
			"0",
			"0",
		]);
		expect(result.discountAmount).toBe("10.00");
		expect(result.merchandiseSubtotal).toBe("0.00");
	});

	it("retains an exact multi-quantity line total when unit cents do not divide", () => {
		const result = allocateCouponDiscount(
			[item("A", 10, 3)],
			coupon("1.00"),
		);

		expect(result.items[0].total).toBe("29.00");
		expect(result.items[0].product.couponPrice).toBe(
			String(29 / 3),
		);
		expect(result.discountAmount).toBe("1.00");
		expect(result.merchandiseSubtotal).toBe("29.00");
	});

	it("breaks remainder ties by ProductId regardless of cart order", () => {
		const forward = allocateCouponDiscount(
			[item("B", 1), item("A", 1)],
			coupon("0.01"),
		);
		const reversed = allocateCouponDiscount(
			[item("A", 1), item("B", 1)],
			coupon("0.01"),
		);

		expect(totalsByProduct(forward.items)).toEqual({A: "0.99", B: "1.00"});
		expect(totalsByProduct(reversed.items)).toEqual({A: "0.99", B: "1.00"});
	});

	it("uses original index only to break ties between duplicate products", () => {
		const result = allocateCouponDiscount(
			[item("A", 1), item("A", 1)],
			coupon("0.01"),
		);

		expect(result.items.map(({total}) => total)).toEqual(["0.99", "1.00"]);
	});

	it.each<[string, CovaCartItem[], Coupon]>([
		["NaN coupon", [item("A", 1)], coupon("not-a-number")],
		["negative coupon", [item("A", 1)], coupon("-1")],
		["infinite coupon", [item("A", 1)], coupon("Infinity")],
		["NaN price", [item("A", Number.NaN)], coupon("1")],
		["negative price", [item("A", -1)], coupon("1")],
		["zero quantity", [item("A", 1, 0)], coupon("1")],
		["negative quantity", [item("A", 1, -1)], coupon("1")],
		["infinite quantity", [item("A", 1, Number.POSITIVE_INFINITY)], coupon("1")],
		["NaN quantity", [item("A", 1, Number.NaN)], coupon("1")],
	])("rejects a %s", (_label, items, appliedCoupon) => {
		expect(() => allocateCouponDiscount(items, appliedCoupon)).toThrow();
	});

	it("accepts a positive fractional quantity", () => {
		const result = allocateCouponDiscount(
			[item("A", 10, 1.5)],
			coupon("3.00"),
		);

		expect(result.items[0].total).toBe("12.00");
		expect(result.items[0].product.couponPrice).toBe("8");
		expect(result.discountAmount).toBe("3.00");
		expect(result.merchandiseSubtotal).toBe("12.00");
	});

	it("does not mutate input items or products", () => {
		const input = [item("A", 10, 2), item("B", 5)];
		const original = JSON.parse(JSON.stringify(input));
		const result = allocateCouponDiscount(input, coupon("2.00"));

		expect(input).toEqual(original);
		expect(result.items).not.toBe(input);
		expect(result.items[0]).not.toBe(input[0]);
		expect(result.items[0].product).not.toBe(input[0].product);
	});
});
