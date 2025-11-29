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
	FormLabel,
} from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
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
import { DELIVERY_ID } from "../../constants";
import { ITotal } from "boundless-api-client";
import { setOrder, setTotal } from "../../redux/reducers/app";
import { IOrderWithCustmAttr } from "../../types/Order";
import { cartHasTickets } from "../../lib/products";
import { hasShipping } from "../../lib/shipping";

// Helper functions for dynamic delivery times
const getVancouverDateTime = () => {
	const now = new Date();
	const options: Intl.DateTimeFormatOptions = {
		timeZone: "America/Vancouver",
		hour: "numeric", // Get hour in numeric format (e.g., "14")
		minute: "numeric", // Get minute in numeric format (e.g., "30")
		weekday: "long", // Get the full name of the weekday (e.g., "Monday")
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour12: false, // Use 24-hour format for the hour
	};
	const formatter = new Intl.DateTimeFormat("en-CA", options);
	const parts = formatter.formatToParts(now);

	let hourVancouver = 0;
	let minuteVancouver = 0;
	let weekdayName = "";
	let year = 0;
	let month = 0;
	let day = 0;

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
			case "year":
				year = parseInt(part.value);
				break;
			case "month":
				month = parseInt(part.value);
				break;
			case "day":
				day = parseInt(part.value);
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

	return { dayOfWeek, hourVancouver, minuteVancouver, year, month, day };
};

const shouldIncludeDeliveryTime = (time: 'ASAP' | '8pm - 8:30pm' | '9pm - 9:30pm' | '4pm - 4:30pm'): string => {
	const { dayOfWeek, hourVancouver, minuteVancouver, year, month, day } = getVancouverDateTime();
	const currentTimeInMinutes = hourVancouver * 60 + minuteVancouver;

	// Special Schedule for November 29th, 2025
	if (year === 2025 && month === 11 && day === 29) {
		if (time === '8pm - 8:30pm' || time === '9pm - 9:30pm') return '';

		const startTime = 9 * 60; // 9:00 AM
		// Close at 4:30 PM
		
		if (time === 'ASAP') {
			const endTime = 16 * 60 + 30; // 4:30 PM
			if (currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime) return time;
			return '';
		}

		if (time === '4pm - 4:30pm') {
			const endTime = 16 * 60; // 4:00 PM (Start of the last slot window logic)
			if (currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime) return time;
			
			// If we are past the slot start time (plus buffer logic similar to original code)
			if (currentTimeInMinutes > endTime + 30) return time;
		}
		
		return '';
	}

	// Sunday (0) to Thursday (4): 9:00 AM (540 min) to 8:30 PM (1230 min)
	if (dayOfWeek >= 0 && dayOfWeek <= 4) {
		if (time === '9pm - 9:30pm') return '';
		
		const startTime = 9 * 60; // 9:00 AM
		const endTime = time === 'ASAP' ? 20 * 60 + 30 : 20 * 60; // 8:30 PM or 8:00 PM
		if (currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime) return time;

		if (time === 'ASAP') return '';
		if (time === '8pm - 8:30pm' && currentTimeInMinutes > endTime + 30) return time;
	}
	// Friday (5) to Saturday (6): 9:00 AM (540 min) to 9:30 PM (1290 min)
	else if (dayOfWeek >= 5 && dayOfWeek <= 6) {
		if (time === '8pm - 8:30pm') return time;
		
		const startTime = 9 * 60; // 9:00 AM
		let endTime;
		if (time === 'ASAP') {
			endTime = 21 * 60 + 30; // 9:30 PM
		} else { // '9pm - 9:30pm'
			endTime = 21 * 60; // 9:00 PM
		}
		if (currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime) return time;

		if (time === 'ASAP') return '';
		if (time === '9pm - 9:30pm' && currentTimeInMinutes > endTime + 30) return time;
	}
	return '';
};

const getDynamicDeliveryTimes = () => {
	const { year, month, day } = getVancouverDateTime();
	const isNov29 = year === 2025 && month === 11 && day === 29;

	const baseDeliveryTimes = [
		shouldIncludeDeliveryTime("ASAP"),
		"9am - 10am",
		"10am - 11am",
		"11am - 12pm",
		"12pm - 1pm",
		"1pm - 2pm",
		"2pm - 3pm",
		"3pm - 4pm",
	];

	if (isNov29) {
		baseDeliveryTimes.push(shouldIncludeDeliveryTime("4pm - 4:30pm"));
	} else {
		baseDeliveryTimes.push(
			"4pm - 5pm",
			"5pm - 6pm",
			"6pm - 7pm",
			"7pm - 8pm",
			shouldIncludeDeliveryTime("8pm - 8:30pm"),
			shouldIncludeDeliveryTime("9pm - 9:30pm")
		);
	}

	return baseDeliveryTimes.filter(item => item !== "");
};

// Custom validation function
const validatePaymentForm = (
	values: IPaymentMethodFormValues,
	isDelivery: boolean
) => {
	const errors: Partial<Record<keyof IPaymentMethodFormValues, string>> = {};

	if (!values.payment_method_id || values.payment_method_id === "0") {
		errors.payment_method_id = "Payment method is required";
	}

	if (values.tip && parseFloat(values.tip) < 0) {
		errors.tip = "Tip must be positive";
	}

	if (isDelivery && !values.delivery_time) {
		errors.delivery_time = "Delivery time is required";
	}

	return errors;
};

export default function PaymentMethodForm({
	paymentPage,
}: {
	paymentPage: IPaymentPageData;
}) {
	const { onSubmit } = useSavePaymentMethod(paymentPage);
	const { t } = useTranslation();
	const order = useAppSelector((state: RootState) => state.app.order);
	const isDelivery =
		order?.services?.some((service) => service.service_id === DELIVERY_ID) ||
		false;

	return (
		<Formik
			initialValues={getFormInitialValues()}
			onSubmit={onSubmit}
			validateOnChange={false}
			validate={(values) => validatePaymentForm(values, isDelivery)}
		>
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
							startIcon={<DoneIcon />}
							type={"submit"}
							disabled={formikProps.isSubmitting}
							color="success"
							size="large"
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
	const orderHasShipping = hasShipping(order as IOrderWithCustmAttr);
	const isDelivery = order?.services?.some(
		(service) => service.service_id === DELIVERY_ID
	);
	const deliveryTimes = getDynamicDeliveryTimes();

	return (
		<Box sx={{ mb: 2 }}>
			<FormControl
				required
				variant="outlined"
				error={Boolean("payment_method_id" in formikProps.errors)}
			>
				{!orderHasShipping && (
					<FormLabel
						component="legend"
						sx={{
							color: "#000",
							fontWeight: "600",
							"&.Mui-focused": {
								color: "#000",
							},
						}}
					>
						Select a payment method
					</FormLabel>
				)}
				<RadioGroup
					name="payment_method_id"
					onChange={formikProps.handleChange}
				>
					{paymentMethods.map(({ payment_method_id, title }) => {
						return (
							<FormControlLabel
								value={payment_method_id}
								control={
									<Radio
										sx={{
											color: "#133e20",
											"&.Mui-checked": {
												color: "#4a7c4d",
											},
										}}
									/>
								}
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
                helperText="Orders placed after hours of operation will be delivered the next day."
								{...fieldAttrs("delivery_time", formikProps)}
							>
								<option value=""></option>
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
			custom_attrs: {
				...checkoutDataOrder.custom_attrs,
				checkoutCompleted: true,
			},
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
