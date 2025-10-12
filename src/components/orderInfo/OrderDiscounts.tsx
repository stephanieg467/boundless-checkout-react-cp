import React from "react";
import Grid from "@mui/material/Grid";
import { IOrderDiscount } from "boundless-api-client";
import PercentIcon from "@mui/icons-material/Percent";
import useFormatCurrency from "../../hooks/useFormatCurrency";
import { useTranslation } from "react-i18next";
import { IOrderWithCustmAttr } from "../../types/Order";

export default function OrderDiscounts({
	order,
}: {
	order: IOrderWithCustmAttr;
}) {
	const { formatCurrency } = useFormatCurrency();
	const discounts = order.discounts;
	const { t } = useTranslation();

	if (!discounts?.length) return null;

	const getDiscountTitleWithAmount = (discount: IOrderDiscount) => {
		if (discount.discount_type === "percent") {
			const discountPercent = discount.value;
			return `${discount.title} (${discountPercent}%)`;
		}

		return discount.title;
	};

	return (
		<div className="bdl-order-items__service-row">
			<h5 className="bdl-order-items__service-heading">
				<PercentIcon
					className="bdl-order-items__service-ico"
					fontSize="small"
				/>
				{t("orderInfo.discounts.title")}
			</h5>
			<Grid container>
				<Grid
					className="bdl-order-items__service-cell bdl-order-items__service-cell_title"
					size={{
						sm: 8,
						xs: 12,
					}}
				>
					{discounts.map((discount) => (
						<div key={discount.discount_id}>
							{getDiscountTitleWithAmount(discount)}
						</div>
					))}
				</Grid>
				<Grid
					className="bdl-order-items__service-cell"
					size={{
						sm: 2,
						xs: 12,
					}}
				></Grid>
				<Grid
					className="bdl-order-items__service-cell"
					size={{
						sm: 2,
						xs: 12,
					}}
				>
					<span className="bdl-order-items__label">
						{t("orderInfo.discounts.total")}{" "}
					</span>
					{order.discount_for_order && (
						<span className="bdl-order-items__value">
							-{formatCurrency(order.discount_for_order)}
						</span>
					)}
				</Grid>
			</Grid>
		</div>
	);
}
