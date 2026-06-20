import Alert from "@mui/material/Alert";
import React from "react";
import {useAppSelector} from "../hooks/redux";
import {TCheckoutStep} from "../types/common";

export default function CheckoutStepWarning({
	step,
}: {
	step: TCheckoutStep;
}) {
	const stepWarning = useAppSelector((state) => state.app.stepWarning);

	if (!stepWarning || stepWarning.step !== step) return null;

	return (
		<Alert severity="warning" sx={{mb: 2}}>
			{stepWarning.message}
		</Alert>
	);
}
