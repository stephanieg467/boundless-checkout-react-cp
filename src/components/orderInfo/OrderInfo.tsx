import React from "react";
import useFormatCurrency from "../../hooks/useFormatCurrency";
import Grid from "@mui/material/Grid";

export default function OrderInfo({ name, amount }: { name: string, amount: string }) {
	if (amount === "0" || amount === "0.00") {
		return null; // Don't render if amount is zero
	}
	
	const { formatCurrency } = useFormatCurrency();

	return (
		<div className="bdl-order-items__service-row">
			<h5 className="bdl-order-items__service-heading">{name}</h5>
			<Grid container style={{ justifyContent: "flex-end" }}>
				<Grid
					className="bdl-order-items__service-cell"
					size={{
						sm: 2,
						xs: 12,
					}}
				>
					{formatCurrency(amount)}
				</Grid>
			</Grid>
		</div>
	);
}
