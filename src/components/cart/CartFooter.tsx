import { TDiscountType } from "boundless-api-client";
import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { useAppSelector } from "../../hooks/redux";
import useFormatCurrency from "../../hooks/useFormatCurrency";
import { useTranslation } from "react-i18next";
import { hasShipping } from "../../lib/shipping";
import { IOrderWithCustmAttr } from "../../types/Order";

export default function CartFooter({ open }: ICartFooterProps) {
	const order = useAppSelector(
		(state) => state.app.order
	) as IOrderWithCustmAttr;
	const total = useAppSelector((state) => state.app.total);
	const { formatCurrency } = useFormatCurrency();
	const { t } = useTranslation();
	const [totalPrice, setTotalPrice] = useState(0);
	const [totalTaxAmount, setTotalTaxAmount] = useState(0);

	useEffect(() => {
		console.log("CartFooter: total", total);
		if (total) {
			const totalTaxAmount = total.tax.totalTaxAmount;
			const servicesSubTotal = Number(total.servicesSubTotal.price) || 0;
			const itemsSubTotal = Number(total.itemsSubTotal.price) || 0;
			const discount = Number(total.discount) || 0;
			const tax = Number(totalTaxAmount) || 0;

			setTotalPrice(servicesSubTotal + itemsSubTotal - discount + tax);
			setTotalTaxAmount(Number(totalTaxAmount));
		} else {
			setTotalPrice(0);
		}
	}, [total]);

	const getDiscountAmount = () => {
		if (!order?.discounts || !order?.discounts.length) return "";
		const discount = order.discounts[0];
		if (discount.discount_type === TDiscountType.percent)
			return ` (${discount.value}%)`;

		return "";
	};

	// const handleRmDiscount = (e: React.MouseEvent) => {
	// 	e.preventDefault();
	// 	if (
	// 		!window.confirm(t("form.areYouSure") as string) ||
	// 		!order?.id ||
	// 		submitting
	// 	)
	// 		return;

	// 	setSubmitting(true);

	// 	const promise = api.checkout
	// 		.clearDiscounts(order.id)
	// 		.then(({ order, total }) => {
	// 			dispatch(setOrder(order));
	// 			dispatch(setTotal(total));
	// 		})
	// 		.catch((err) => console.error(err))
	// 		.finally(() => setSubmitting(false));

	// 	dispatch(addPromise(promise));
	// };

	if (!order || !total) return null;

	const hasDiscount = total.discount != "0";
	const orderHasShipping = hasShipping(order);

	return (
		<div className={clsx("bdl-cart__footer", { open })}>
			{(orderHasShipping || hasDiscount) && (
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
			{hasDiscount && (
				<div className="bdl-cart__footer-row">
					<h5 className="bdl-cart__footer-title">
						{t("cart.footer.couponTitle", { amount: getDiscountAmount() })}
						<span className="bdl-cart__footer-value">
							{" "}
							-{formatCurrency(total.discount)}
						</span>
					</h5>
				</div>
			)}
			{orderHasShipping && (
				<div className="bdl-cart__footer-row">
					<h5 className="bdl-cart__footer-title">
						{t("cart.footer.shipping")}
						<span className="bdl-cart__footer-value">
							{" "}
							{formatCurrency(total.servicesSubTotal.price)}
						</span>
					</h5>
				</div>
			)}

			<div className="bdl-cart__footer-row">
				<h5 className="bdl-cart__footer-title">
					Tax:
					<span className="bdl-cart__footer-value">
						{formatCurrency(totalTaxAmount ?? 0)}
					</span>
				</h5>
			</div>
			<h4 className="bdl-cart__footer-row bdl-cart__footer-row_total">
				{t("cart.footer.total")}{" "}
				<span className="bdl-cart__footer-value">
					{formatCurrency(totalPrice)}
				</span>
			</h4>

			{/* {hasDiscount && (
				<div className="bdl-cart__footer-rm">
					<small>
						<a
							href="#"
							className="bdl-cart__footer-rm-link"
							onClick={handleRmDiscount}
						>
							{t("cart.footer.removeCoupon")}
						</a>
					</small>
				</div>
			)} */}
		</div>
	);
}

interface ICartFooterProps {
	open: boolean;
}
