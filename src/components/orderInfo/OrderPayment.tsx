import Grid from "@mui/material/Grid";
import React from "react";
import PaymentsIcon from "@mui/icons-material/Payments";
import useFormatCurrency from "../../hooks/useFormatCurrency";
import {useTranslation} from "react-i18next";
import {IOrderWithCustmAttr} from "../../types/Order";

export default function OrderPayment({
	order,
}: {
	order: IOrderWithCustmAttr;
}) {
	const paymentMethod = order.paymentMethod;
	const {formatCurrency} = useFormatCurrency();
	const {t} = useTranslation();

	if (!paymentMethod) return null;

	const hasMarkUp = order.payment_mark_up && Number(order.payment_mark_up) > 0;

	return (
		<div className="bdl-order-items__service-row">
			<h5 className="bdl-order-items__service-heading">
				<PaymentsIcon
					className="bdl-order-items__service-ico"
					fontSize="small"
				/>
				{t("orderInfo.payment.title")}
			</h5>
			<Grid container>
				<Grid
					className="bdl-order-items__service-cell bdl-order-items__service-cell_title"
					size={{
						sm: 8,
						xs: 12,
					}}
				>
					{paymentMethod.title || ""}
				</Grid>
				<Grid
					className="bdl-order-items__service-cell"
					size={{
						sm: 2,
						xs: 12,
					}}
				>
					{hasMarkUp && (
						<>
							<span className="bdl-order-items__label">
								{t("orderInfo.payment.markUp")}{" "}
							</span>
							{paymentMethod.mark_up}%
						</>
					)}
				</Grid>
				<Grid
					className="bdl-order-items__service-cell"
					size={{
						sm: 2,
						xs: 12,
					}}
				>
					{hasMarkUp && (
						<>
							<span className="bdl-order-items__label">
								{t("orderInfo.payment.total")}{" "}
							</span>
							{formatCurrency(order.payment_mark_up!)}
						</>
					)}
				</Grid>
			</Grid>
		</div>
	);
}
