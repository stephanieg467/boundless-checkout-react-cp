import { Grid } from "@mui/material";
import React from "react";
import OrderDiscounts from "./OrderDiscounts";
import OrderPayment from "./OrderPayment";
import OrderRow from "./OrderRow";
import OrderShipping from "./OrderShipping";
import OrderTotalRow from "./OrderTotalRow";
import OrderTaxes from "./OrderTaxes";
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
						item
						sm={6}
						xs={12}
						className="bdl-order-items__thead-cell"
					></Grid>
					<Grid item sm={2} xs={12} className="bdl-order-items__thead-cell">
						Price
					</Grid>
					<Grid item sm={2} xs={12} className="bdl-order-items__thead-cell">
						Qty
					</Grid>
					<Grid item sm={2} xs={12} className="bdl-order-items__thead-cell">
						Total
					</Grid>
				</Grid>
				{items.map((item) => (
					<OrderRow item={item} key={item.product.ProductId} />
				))}
				{showSubtotal && (
					<OrderTotalRow
						price={itemsSubTotal.price}
						qty={itemsSubTotal.qty}
						isSubTotal
					/>
				)}
				{/* <OrderDiscounts order={order} /> */}
				{order.services && (
					<OrderShipping
						services={order.services}
						customer={order.customer ?? null}
						hasShipping={hasShipping(order)}
					/>
				)}
				{order.paymentMethod && <OrderPayment order={order} />}
				{hasTaxes && <OrderTaxes order={order} />}
				{total_price && (
					<OrderTotalRow price={total_price} qty={itemsSubTotal.qty} />
				)}
			</div>
		</>
	);
}
