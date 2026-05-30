import React from "react";
import clsx from "clsx";
import useFormatCurrency from "../../hooks/useFormatCurrency";
import {useTranslation} from "react-i18next";
import {hasDeliveryId, hasShipping} from "../../lib/shipping";
import {getCheckoutData} from "../../hooks/checkoutData";
import {getCartOrRetrieve} from "../../hooks/getCartOrRetrieve";
import {DELIVERY_ID} from "../../constants";
import {useAppSelector} from "../../hooks/redux";

const parseAmount = (value: string | number | null | undefined): number => {
	const amount = Number(value ?? 0);
	return Number.isFinite(amount) ? amount : 0;
};

const parsePositiveAmount = (
	value: string | number | null | undefined,
): number => {
	const amount = parseAmount(value);
	return amount > 0 ? amount : 0;
};

export default function CartFooter({open}: ICartFooterProps) {
	const {order: reduxOrder, total: reduxTotal} = useAppSelector(
		(state) => state.app,
	);
	const checkoutData = !reduxOrder || !reduxTotal ? getCheckoutData() : undefined;
	const order = reduxOrder ?? checkoutData?.order;
	const total = reduxTotal ?? checkoutData?.total;
	const cart = getCartOrRetrieve();
	
	const {formatCurrency} = useFormatCurrency();
	const {t} = useTranslation();

	const itemsSubTotal = parseAmount(total?.itemsSubTotal?.price);
	const servicesSubTotal = parseAmount(total?.servicesSubTotal?.price);
	const totalTaxAmount = total
		? parseAmount(total.tax?.totalTaxAmount)
		: parseAmount(cart?.taxAmount);
	const tipAmount = parsePositiveAmount(order?.tip);
	const fallbackTotalPrice = total
		? itemsSubTotal + servicesSubTotal + totalTaxAmount + tipAmount
		: parseAmount(cart?.total?.total) + totalTaxAmount + tipAmount;
	const totalPrice =
		total?.price !== undefined && total.price !== null && total.price !== ""
			? parseAmount(total.price)
			: fallbackTotalPrice;

	const getDiscountAmount = () => {
		if (!order?.discounts || !order?.discounts.length) return "";
		const discount = order.discounts[0];
		if (discount.discount_type === "percent") {
			const discountPercent = discount.value;
			return ` (${discountPercent}%)`;
		}

		return "";
	};

	const hasDiscount = total && total.discount != "0";
	const orderHasShipping = order && hasShipping(order);
	const isDelivery = order && hasDeliveryId(order, DELIVERY_ID);

	return (
		<div className={clsx("bdl-cart__footer", {open})}>
			{hasDiscount && (
				<div className="bdl-cart__footer-row">
					<h5 className="bdl-cart__footer-title">
						{t("cart.footer.couponTitle", {amount: getDiscountAmount()})}
						<span className="bdl-cart__footer-value">
							{" "}-{formatCurrency(total?.discount)}
						</span>
					</h5>
				</div>
			)}
			{total && (
				<div className="bdl-cart__footer-row">
					<h5 className="bdl-cart__footer-title">
						{t("cart.footer.subTotal")}
						<span className="bdl-cart__footer-value">
							{" "}
							{formatCurrency(total.itemsSubTotal.price)}
						</span>
					</h5>
				</div>
			)}
			{orderHasShipping && total && (
				<div className="bdl-cart__footer-row">
					<h5 className="bdl-cart__footer-title">
						{isDelivery ? t("cart.footer.delivery") : t("cart.footer.shipping")}
						<span className="bdl-cart__footer-value">
							{Number(total.itemsSubTotal.price) >= 100 ? (
								<>
									<span style={{textDecoration: "line-through", color: "#999"}}>
										{formatCurrency(isDelivery ? "4.00" : "0.00")}
									</span>
									<span style={{color: "#4a7c4d", fontWeight: "bold", marginLeft: "8px"}}>
										FREE
									</span>
								</>
							) : (
								` ${formatCurrency(total.servicesSubTotal.price)}`
							)}
						</span>
					</h5>
				</div>
			)}
			{tipAmount > 0 && (
				<div className="bdl-cart__footer-row">
					<h5 className="bdl-cart__footer-title">
						{t("cart.footer.tip")}
						<span className="bdl-cart__footer-value">
							{" "}{formatCurrency(tipAmount)}
						</span>
					</h5>
				</div>
			)}

			<div className="bdl-cart__footer-row">
				<h5 className="bdl-cart__footer-title">
					Tax:
					<span className="bdl-cart__footer-value">
						{" "}{formatCurrency(totalTaxAmount ?? 0)}
					</span>
				</h5>
			</div>
			<h4 className="bdl-cart__footer-row bdl-cart__footer-row_total">
				{t("cart.footer.total")}{" "}
				<span className="bdl-cart__footer-value">
					{formatCurrency(totalPrice)}
				</span>
			</h4>
		</div>
	);
}

interface ICartFooterProps {
	open: boolean;
}
