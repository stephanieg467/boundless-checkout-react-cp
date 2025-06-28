import React from "react";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import {
	Typography,
	Radio,
	RadioGroup,
	FormControlLabel,
	FormControl,
	FormHelperText,
	Button,
	Box,
	TextField,
	InputAdornment,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import ExtraErrors from "../../components/ExtraErrors";
import { useTranslation } from "react-i18next";
import { IPaymentMethod, IPaymentPageData } from "../PaymentPage";
import {
	getCheckoutData,
	setLocalStorageCheckoutData,
} from "../../hooks/checkoutData";
import { fieldAttrs } from "../../lib/formUtils";
import { RootState } from "../../redux/store";
import { DELIVERY_ID, PAY_IN_STORE_PAYMENT_METHOD } from "../../constants";
import { ITotal } from "boundless-api-client";
import { setOrder, setTotal } from "../../redux/reducers/app";
import { IOrderWithCustmAttr } from "../../types/Order";
import { cartHasTickets } from "../../lib/products";

// Helper functions for dynamic delivery times
const getVancouverDateTime = () => {
	const now = new Date();
	const options: Intl.DateTimeFormatOptions = {
		timeZone: "America/Vancouver",
		hour: 'numeric',    // Get hour in numeric format (e.g., "14")
		minute: 'numeric',  // Get minute in numeric format (e.g., "30")
		weekday: 'long',    // Get the full name of the weekday (e.g., "Monday")
		hour12: false       // Use 24-hour format for the hour
	};
	const formatter = new Intl.DateTimeFormat("en-CA", options);
	const parts = formatter.formatToParts(now);

	let hourVancouver = 0;
	let minuteVancouver = 0;
	let weekdayName = "";

	for (const part of parts) {
		switch (part.type) {
			case "hour":
				// The hour might be '24' for midnight in some locales with hourCycle h24, map to 0.
				// For hourCycle h23 (default for en-CA numeric), it's 0-23.
				const hr = parseInt(part.value);
				hourVancouver = hr === 24 ? 0 : hr;
				break;
			case "minute":
				minuteVancouver = parseInt(part.value);
				break;
			case "weekday":
				weekdayName = part.value;
				break;
		}
	}

	const dayMap: { [key: string]: number } = {
		Sunday: 0,
		Monday: 1,
		Tuesday: 2,
		Wednesday: 3,
		Thursday: 4,
		Friday: 5,
		Saturday: 6,
	};
	const dayOfWeek = dayMap[weekdayName];

	return { dayOfWeek, hourVancouver, minuteVancouver };
};

const shouldIncludeASAP = () => {
	const { dayOfWeek, hourVancouver, minuteVancouver } = getVancouverDateTime();
	const currentTimeInMinutes = hourVancouver * 60 + minuteVancouver;

	// Sunday (0) to Thursday (4): 9:00 AM (540 min) to 8:30 PM (1230 min)
	if (dayOfWeek >= 0 && dayOfWeek <= 4) {
		const startTime = 9 * 60; // 9:00 AM
		const endTime = 20 * 60 + 30; // 8:30 PM
		return currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
	}
	// Friday (5) to Saturday (6): 9:00 AM (540 min) to 9:30 PM (1290 min)
	else if (dayOfWeek >= 5 && dayOfWeek <= 6) {
		const startTime = 9 * 60; // 9:00 AM
		const endTime = 21 * 60 + 30; // 9:30 PM
		return currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
	}
	return false; // Outside defined days
};

const getDynamicDeliveryTimes = () => {
	const baseDeliveryTimes = [
		"9am - 10am",
		"10am - 11am",
		"11am - 12pm",
		"12pm - 1pm",
		"1pm - 2pm",
		"2pm - 3pm",
		"3pm - 4pm",
		"4pm - 5pm",
		"5pm - 6pm",
		"6pm - 7pm",
		"7pm - 8pm",
		"8pm - 8:30pm",
	];

	if (shouldIncludeASAP()) {
		return ["ASAP", ...baseDeliveryTimes];
	}
	return baseDeliveryTimes;
};

export default function PaymentMethodForm({
	paymentPage,
}: {
	paymentPage: IPaymentPageData;
}) {
	const { onSubmit } = useSavePaymentMethod(paymentPage);
	const { t } = useTranslation();

	return (
		<Formik initialValues={getFormInitialValues()} onSubmit={onSubmit}>
			{(formikProps) => (
				<Form className={"bdl-payment-form"}>
					{Object.keys(formikProps.errors).length > 0 && (
						<ExtraErrors
							excludedFields={["payment_method_id"]}
							errors={formikProps.errors}
						/>
					)}
					<Typography variant="h5" sx={{ mb: 2 }}>
						{t("paymentMethodForm.pageHeader")}
					</Typography>
					{cartHasTickets() && (
						<Typography variant="body1" sx={{ m: 2 }}>
							{
								"Please note, due to limited seating, to reserve your seats, we require payment by credit card online OR you can come in store to purchase your tickets in person by credit, cash or debit. Seats must be purchased prior to event date. We look forward to hosting you!"
							}
						</Typography>
					)}
					<PaymentMethods
						formikProps={formikProps}
						paymentMethods={paymentPage.paymentMethods}
					/>
					<Box textAlign={"end"}>
						<Button
							variant="contained"
							startIcon={<PaymentIcon />}
							type={"submit"}
							disabled={formikProps.isSubmitting}
							color="success"
						>
							{t("paymentMethodForm.completeOrder")}
						</Button>
					</Box>
				</Form>
			)}
		</Formik>
	);
}

const getFormInitialValues = () => {
	const order = useAppSelector((state: RootState) => state.app.order);

	const initialValues: IPaymentMethodFormValues = {
		payment_method_id: order?.payment_method_id || "0",
	};

	return initialValues;
};

const PaymentMethods = ({
	formikProps,
	paymentMethods,
}: {
	formikProps: FormikProps<IPaymentMethodFormValues>;
	paymentMethods: IPaymentMethod[];
}) => {
	const order = useAppSelector((state: RootState) => state.app.order);
	const isDelivery = order?.services?.some(
		(service) => service.service_id === DELIVERY_ID
	);
	const deliveryTimes = getDynamicDeliveryTimes();

	return (
		<Box sx={{ mb: 2 }}>
			<FormControl
				variant="outlined"
				error={Boolean("payment_method_id" in formikProps.errors)}
			>
				<RadioGroup
					name="payment_method_id"
					onChange={formikProps.handleChange}
				>
					{paymentMethods.map(({ payment_method_id, title }) => {
						return (
							<FormControlLabel
								value={payment_method_id}
								control={<Radio required={true} />}
								label={title}
								key={payment_method_id}
							/>
						);
					})}
				</RadioGroup>
				{"payment_method_id" in formikProps.errors && (
					<FormHelperText>
						{formikProps.errors.payment_method_id}
					</FormHelperText>
				)}
				{isDelivery && (
					<>
						<Box sx={{ mb: 2, mt: 2 }}>
							<TextField
								label="Tip"
								type="number"
								variant={"outlined"}
								{...fieldAttrs("tip", formikProps)}
								slotProps={{
									input: {
										startAdornment: (
											<InputAdornment position="start">$</InputAdornment>
										),
									},
									htmlInput: {
										min: "0",
										step: "0.01",
									},
								}}
							/>
						</Box>
						<Box sx={{ mb: 2 }}>
							<TextField
								required={true}
								label="Delivery time"
								variant={"outlined"}
								fullWidth
								select
								slotProps={{
									select: { native: true },
								}}
								{...fieldAttrs("delivery_time", formikProps)}
							>
								<option>Select delivery time</option>
								{deliveryTimes.map((deliveryTime, idx) => (
									<option key={idx} value={deliveryTime}>
										{deliveryTime}
									</option>
								))}
							</TextField>
						</Box>
					</>
				)}
			</FormControl>
		</Box>
	);
};

const useSavePaymentMethod = (paymentPage: IPaymentPageData) => {
	const { order, onThankYouPage, total } = useAppSelector((state) => state.app);
	const dispatch = useAppDispatch();

	const onSubmit = (
		values: IPaymentMethodFormValues,
		{ setSubmitting }: FormikHelpers<IPaymentMethodFormValues>
	) => {
		const { order: checkoutDataOrder } = getCheckoutData() || {};

		if (!order || !checkoutDataOrder) return;

		const { payment_method_id, tip, delivery_time } = values;

		let updatedOrder = {
			...checkoutDataOrder,
			paymentMethod: paymentPage.paymentMethods.find(
				(method) => method.payment_method_id === payment_method_id
			),
			delivery_time: delivery_time || "",
			tip: tip ? parseFloat(tip).toString() : "0",
			payment_method_id: payment_method_id,
		};
		let updatedTotal = { ...total };

		if (tip) {
			updatedOrder = {
				...updatedOrder,
				total_price: (
					(Number(checkoutDataOrder.total_price) || 0) + parseFloat(tip)
				).toString(),
			};
			updatedTotal = {
				...total,
				price: ((Number(total?.price) || 0) + parseFloat(tip)).toString(),
			};
		}

		setLocalStorageCheckoutData({
			order: {
				...updatedOrder,
			} as IOrderWithCustmAttr,
			total: updatedTotal as unknown as ITotal,
		});

		dispatch(setOrder(updatedOrder as unknown as IOrderWithCustmAttr));
		dispatch(setTotal(updatedTotal as unknown as ITotal));

		onThankYouPage!({ orderId: checkoutDataOrder.id });
		setSubmitting(false);
	};

	return {
		onSubmit,
	};
};

export interface IPaymentMethodFormValues {
	payment_method_id: number | string;
	tip?: string;
	delivery_time?: string;
}
