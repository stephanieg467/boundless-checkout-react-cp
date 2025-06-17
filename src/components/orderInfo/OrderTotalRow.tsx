import Grid from "@mui/material/Grid";
import React from "react";
import useFormatCurrency from "../../hooks/useFormatCurrency";
import { useTranslation } from "react-i18next";

export default function OrderTotalRow({
	price,
	qty,
	isSubTotal,
}: {
	price: string | number;
	qty: string | number;
	isSubTotal?: boolean;
}) {
	const { formatCurrency } = useFormatCurrency();
	const { t } = useTranslation();

	return (
		<Grid container className="bdl-order-items__total-row">
			<Grid
				className="bdl-order-items__total-cell bdl-order-items__total-cell_title"
				size={{
					sm: 8,
					xs: 12,
				}}
			>
				{isSubTotal
					? t("orderInfo.totalRow.titleSubTotal")
					: t("orderInfo.totalRow.titleTotal")}
			</Grid>
			<Grid
				className="bdl-order-items__total-cell"
				size={{
					sm: 2,
					xs: 12,
				}}
			>
				<span className="bdl-order-items__label">
					{t("orderInfo.totalRow.qty")}{" "}
				</span>
				<span className="bdl-order-items__value">{qty}</span>
			</Grid>
			<Grid
				className="bdl-order-items__total-cell"
				size={{
					sm: 2,
					xs: 12,
				}}
			>
				<span className="bdl-order-items__label">
					{t("orderInfo.totalRow.price")}{" "}
				</span>
				<span className="bdl-order-items__value">{formatCurrency(price)}</span>
			</Grid>
		</Grid>
	);
}
