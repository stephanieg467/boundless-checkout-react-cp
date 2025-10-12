import Grid from "@mui/material/Grid";
import React from "react";
import OrderDiscounts from "./OrderDiscounts";
import OrderPayment from "./OrderPayment";
import OrderRow from "./OrderRow";
import OrderShipping from "./OrderShipping";
import OrderTotalRow from "./OrderTotalRow";
import OrderInfo from "./OrderInfo";
import { hasShipping } from "../../lib/shipping";
import { IOrderWithCustmAttr } from "../../types/Order";
import { CovaCartItem } from "../../types/cart";
import { ITotal } from "boundless-api-client";

export default function OrderItems({
	order,
	total,
	items,
}: {
	total: ITotal;
	order: IOrderWithCustmAttr;
	items: CovaCartItem[];
}) {
	const { total_price } = order;
	const hasTaxes = order.tax_amount !== null;
	const showSubtotal =
		order.services?.length ||
		order.discounts?.length ||
		order.paymentMethod ||
		hasTaxes;

	const itemsSubTotal = total.itemsSubTotal;

	return (
		<>
			<div className="bdl-order-items">
				<Grid container className="bdl-order-items__thead">
					<Grid
						className="bdl-order-items__thead-cell"
						size={{
							sm: 6,
							xs: 12,
						}}
					></Grid>
					<Grid
						className="bdl-order-items__thead-cell"
						size={{
							sm: 2,
							xs: 12,
						}}
					>
						Price
					</Grid>
					<Grid
						className="bdl-order-items__thead-cell"
						size={{
							sm: 2,
							xs: 12,
						}}
					>
						Qty
					</Grid>
					<Grid
						className="bdl-order-items__thead-cell"
						size={{
							sm: 2,
							xs: 12,
						}}
					>
						Total
					</Grid>
				</Grid>
				{items.map((item) => (
					<OrderRow item={item} key={item.product.ProductId} />
				))}
				<OrderDiscounts order={order} />
				{showSubtotal && (
					<OrderTotalRow
						price={itemsSubTotal.price}
						qty={itemsSubTotal.qty}
						isSubTotal
					/>
				)}
				{order.services && (
					<OrderShipping
						services={order.services}
						customer={order.customer ?? null}
						hasShipping={hasShipping(order)}
					/>
				)}
				{order.paymentMethod && <OrderPayment order={order} />}
				{order.tip ? <OrderInfo name="Tip" amount={order.tip} /> : null}
				{order.tax_amount && <OrderInfo name="Tax" amount={order.tax_amount} />}
				{total_price && (
					<OrderTotalRow price={total_price} qty={itemsSubTotal.qty} />
				)}
			</div>
		</>
	);
}
