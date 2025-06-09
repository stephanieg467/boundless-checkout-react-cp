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
	const deliveryTimes = [
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

	return (
		<Box sx={{ mb: 2 }}>
			<FormControl
				variant="standard"
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
						<Box sx={{ mb: 2 }}>
							<TextField
								label="Tip"
								type="number"
								variant={"standard"}
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
								label="Delivery time"
								variant={"standard"}
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
	console.log("useSavePaymentMethod order", order);
	const dispatch = useAppDispatch();

	const onSubmit = (
		values: IPaymentMethodFormValues,
		{ setSubmitting }: FormikHelpers<IPaymentMethodFormValues>
	) => {
		const { order: checkoutDataOrder } = getCheckoutData() || {};

		if (!order || !checkoutDataOrder) return;

		console.log("useSavePaymentMethod checkoutDataOrder", checkoutDataOrder);

		const { payment_method_id, tip, delivery_time } = values;

		let updatedOrder = {
			...checkoutDataOrder,
			paymentMethod: paymentPage.paymentMethods.find(
				(method) => method.payment_method_id === payment_method_id
			),
			delivery_time: delivery_time || "",
			tip: tip ? parseFloat(tip).toString() : 0,
			payment_method_id: payment_method_id,
			paid_at:
				payment_method_id.toString() === PAY_IN_STORE_PAYMENT_METHOD
					? new Date().toISOString()
					: "",
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
		console.log("useSavePaymentMethod updatedOrder", {
			...updatedOrder,
		});

		dispatch(setOrder(updatedOrder as unknown as IOrderWithCustmAttr));
		dispatch(setTotal(updatedTotal as unknown as ITotal));

		onThankYouPage!({ orderId: checkoutDataOrder.id});
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
