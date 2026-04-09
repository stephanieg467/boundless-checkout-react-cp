import { Step, StepButton, Stepper } from "@mui/material";
import React, { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { setCurrentStep } from "../redux/reducers/app";
import { useTranslation } from "react-i18next";
import { TCheckoutStep } from "../types/common";
import { ordersDropShippingItems } from "../lib/products";

export default function CheckoutProgress() {
	const { stepper, items } = useAppSelector((state) => state.app);
	const dispatch = useAppDispatch();
	const { t } = useTranslation();
	const hasDropShipItems = ordersDropShippingItems(items ?? []).length > 0;

	const currentStepIndex = stepper
		? stepper.steps.indexOf(stepper.currentStep)
		: 0;

	const handleStepChange = (step: TCheckoutStep) => {
		dispatch(setCurrentStep(step));
	};

	const checkoutStepTitles = useMemo(
		() => ({
			[TCheckoutStep.contactInfo]: t("checkoutProgress.contactInfo"),
			[TCheckoutStep.shippingAddress]: t("checkoutProgress.shippingAddress"),
			...(hasDropShipItems && {
				[TCheckoutStep.deliveryDetails]: t("checkoutProgress.deliveryDetails"),
			}),
			[TCheckoutStep.paymentMethod]: t("checkoutProgress.paymentMethod"),
			[TCheckoutStep.thankYou]: t("checkoutProgress.thankYou"),
		}),
		[t, hasDropShipItems],
	);

	if (!stepper) return null;

	return (
		<div className="bdl-checkout-progress">
			<Stepper activeStep={currentStepIndex} alternativeLabel nonLinear>
				{stepper.steps.map((step) => (
					<Step key={step}>
						<StepButton color="inherit" onClick={() => handleStepChange(step)}>
							{checkoutStepTitles[step]}
						</StepButton>
					</Step>
				))}
			</Stepper>
		</div>
	);
}
