import currency from "currency.js";
import {Coupon, CovaCartItem} from "../types/cart";
import {covaProductPrice, isPromotionItem} from "./products";

interface CouponDiscountAllocation {
	items: CovaCartItem[];
	discountAmount: string;
	merchandiseSubtotal: string;
}

interface EligibleLine {
	index: number;
	lineCents: number;
	productId: string;
	allocation: number;
	remainder: number;
}

/** Formats an integer cent amount as a two-decimal string. */
const formatCents = (cents: number): string =>
	currency(cents, {fromCents: true}).toString();

/**
 * Rounds a computed cent amount half up. The one-epsilon relative nudge absorbs
 * float noise that lands a half-cent tie just below .5 (55.00 at 0.7% computes
 * to 38.49999999999999 cents) without lifting genuinely smaller fractions.
 * @param cents Unrounded cent amount.
 * @returns Nearest integer cents.
 */
const roundCents = (cents: number): number =>
	Math.round(cents + cents * Number.EPSILON);

/**
 * Validates a cart line and returns its base amount in cents.
 * @param item Original line with selected base price and quantity.
 * @returns Rounded line amount in cents.
 */
const originalLineCents = (item: CovaCartItem): number => {
	if (!Number.isFinite(item.qty) || item.qty <= 0) {
		throw new Error("Cart item quantity must be a finite, positive number.");
	}

	const basePrice = Number(covaProductPrice(item.product));
	if (!Number.isFinite(basePrice) || basePrice < 0) {
		throw new Error("Cart item price must be a finite, non-negative number.");
	}

	return currency(basePrice).multiply(item.qty).intValue;
};

/**
 * Orders tied cent remainders consistently across cart permutations.
 * @param left First eligible line.
 * @param right Second eligible line.
 * @returns Sort order by remainder, product ID, then original index.
 */
const compareRemainders = (left: EligibleLine, right: EligibleLine): number => {
	if (left.remainder !== right.remainder) return right.remainder - left.remainder;
	if (left.productId !== right.productId) {
		return left.productId < right.productId ? -1 : 1;
	}
	return left.index - right.index;
};

/**
 * Gives each eligible line its floor share, then distributes remainder cents.
 * @param lines Eligible original-price cart lines to update in place.
 * @param discountCents Rounded coupon amount in cents.
 * @param eligibleCents Original eligible subtotal in cents.
 */
const distributeCents = (
	lines: EligibleLine[],
	discountCents: number,
	eligibleCents: number,
): void => {
	if (eligibleCents === 0 || discountCents === 0) return;

	for (const line of lines) {
		const weightedDiscount = discountCents * line.lineCents;
		line.allocation = Math.floor(weightedDiscount / eligibleCents);
		line.remainder = weightedDiscount % eligibleCents;
	}

	const centsToReconcile =
		discountCents - lines.reduce((total, line) => total + line.allocation, 0);
	for (const line of [...lines].sort(compareRemainders).slice(0, centsToReconcile)) {
		line.allocation += 1;
	}
};

/**
 * Allocates one coupon proportionally across eligible cart lines.
 * @param items Original cart items whose selected base prices determine line values.
 * @param coupon Resolved coupon; "Percent" is percentage-based and other types are fixed amounts.
 * @returns Copied items with exact discounted line totals, plus the rounded discount and subtotal.
 * @throws When coupon values, selected base prices, or quantities are invalid.
 */
export const allocateCouponDiscount = (
	items: CovaCartItem[],
	coupon: Coupon,
): CouponDiscountAllocation => {
	const couponValue = Number(coupon.value);
	if (!Number.isFinite(couponValue) || couponValue < 0) {
		throw new Error("Coupon value must be a finite, non-negative number.");
	}

	const copiedItems = items.map((item) => ({
		...item,
		product: {...item.product},
	}));
	const eligibleLines: EligibleLine[] = [];
	let merchandiseCents = 0;

	items.forEach((item, index) => {
		const lineCents = originalLineCents(item);
		merchandiseCents += lineCents;
		if (!isPromotionItem(item.product)) {
			eligibleLines.push({
				index,
				lineCents,
				productId: item.product.ProductId,
				allocation: 0,
				remainder: 0,
			});
		}
	});

	const eligibleCents = eligibleLines.reduce(
		(total, line) => total + line.lineCents,
		0,
	);
	const requestedDiscountCents =
		coupon.type === "Percent"
			? roundCents((eligibleCents * couponValue) / 100)
			: currency(couponValue).intValue;
	const discountCents = Math.min(requestedDiscountCents, eligibleCents);

	distributeCents(eligibleLines, discountCents, eligibleCents);

	for (const line of eligibleLines) {
		const item = copiedItems[line.index];
		const total = formatCents(line.lineCents - line.allocation);
		item.total = total;
		item.product.couponPrice = String(Number(total) / item.qty);
	}

	return {
		items: copiedItems,
		discountAmount: formatCents(discountCents),
		merchandiseSubtotal: formatCents(merchandiseCents - discountCents),
	};
};
