import {completeCreditCardPaymentOutcome} from "../../lib/paymentOutcome";
import {useCallback, useState} from "react";
import {Form, Formik, FormikHelpers, FormikProps} from "formik";
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
	CircularProgress,
	Alert,
} from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import {useAppDispatch, useAppSelector} from "../../hooks/redux";
import ExtraErrors from "../../components/ExtraErrors";
import {useTranslation} from "react-i18next";
import {IPaymentMethod, IPaymentPageData} from "../PaymentPage";
import {
	getCheckoutData,
	setLocalStorageCheckoutData,
} from "../../hooks/checkoutData";
import {fieldAttrs} from "../../lib/formUtils";
import {CREDIT_CARD_PAYMENT_METHOD, DELIVERY_ID} from "../../constants";
import {setOrder, setTotal} from "../../redux/reducers/app";
import {IOrderWithCustmAttr} from "../../types/Order";
import {
	cartHasTickets,
	ordersDropShippingItems,
	ordersRegularItems,
} from "../../lib/products";
import {hasDeliveryId, hasShipping} from "../../lib/shipping";
import {DeliveryTimeSelector} from "../deliveryDetailsPage/helpers";
import {renderDeliveryTimeOptions} from "../deliveryDetailsPage/DeliveryDetailsForm";
import {useDeliveryTimes} from "../../hooks/useDeliveryTimes";
import {useCheckoutConfig} from "../../contexts/CheckoutConfigContext";
import PayHQ from "./PayHQ/PayHQ";
import {useCreditCardPaymentOutcome} from "../../hooks/useCreditCardPaymentOutcome";

const makeValidatePaymentForm =
	(requireDeliveryTime: boolean) => (values: IPaymentMethodFormValues) => {
		const errors: Partial<Record<keyof IPaymentMethodFormValues, string>> = {};

		if (!values.payment_method_id || values.payment_method_id === "0") {
			errors.payment_method_id = "Payment method is required";
		}

		if (values.tip && parseFloat(values.tip) < 0) {
			errors.tip = "Tip must be positive";
		}

		if (requireDeliveryTime && !values.delivery_time) {
			errors.delivery_time = "Delivery time is required";
		}

		return errors;
	};

const usePaymentDeliveryContext = () => {
	const {order, items} = useAppSelector((state) => state.app);
	const isDelivery = order ? hasDeliveryId(order, DELIVERY_ID) : false;
	const hasDropShipItems = ordersDropShippingItems(items ?? []).length > 0;
	const regularItems = ordersRegularItems(items ?? []);
	const requireDeliveryTime = isDelivery && !hasDropShipItems;
	return {isDelivery, requireDeliveryTime, regularItems};
};

export default function PaymentMethodForm({
	paymentPage,
}: {
	paymentPage: IPaymentPageData;
}) {
	const checkoutData = getCheckoutData();
	const {order, items, total} = checkoutData || {};
	const {onSubmit} = useSavePaymentMethod(paymentPage);
	const {requireDeliveryTime, isDelivery} = usePaymentDeliveryContext();
	const {t} = useTranslation();
	const {recordApprovedPayment} = useCreditCardPaymentOutcome();
	const [isPaymentApproved, setIsPaymentApproved] = useState(false);

	const handlePaymentApproved = useCallback(
		(paidAt: string, tipAmount?: string) => {
			recordApprovedPayment({paidAt, tip: tipAmount});
			setIsPaymentApproved(true);
		},
		[recordApprovedPayment],
	);

	const {
		isLoading: loadingDeliveryTimes,
		isError: errorLoadingDeliveryTimes,
		data: deliveryTimes,
	} = useDeliveryTimes({returnTimeForTodayAndTwoDaysFromNow: false});

	const paymentMethods = paymentPage.paymentMethods;
	const onlyPaymentMethodIsCreditCard = paymentMethods.length === 1 && paymentMethods[0].payment_method_id === CREDIT_CARD_PAYMENT_METHOD;

	const nextDayHelperText = deliveryTimes?.isNextDay
		? "NOTE: Delivery is closed for the day; your order will be delivered tomorrow."
		: "Will be delivered today.";

	return (
		<Formik
			initialValues={getFormInitialValues(order, paymentMethods)}
			onSubmit={onSubmit}
			validateOnChange={false}
			validate={makeValidatePaymentForm(requireDeliveryTime)}
		>
			{(formikProps) => {
				const {values} = formikProps;
				const selectedPaymentMethodId = values.payment_method_id;
				const isCreditCard =
					selectedPaymentMethodId === CREDIT_CARD_PAYMENT_METHOD;
				const showPayHQ = selectedPaymentMethodId === CREDIT_CARD_PAYMENT_METHOD || onlyPaymentMethodIsCreditCard;

				return (
					<Form className={"bdl-payment-form"}>
						{Object.keys(formikProps.errors).length > 0 && (
							<ExtraErrors
								excludedFields={["payment_method_id", "delivery_time"]}
								errors={formikProps.errors}
							/>
						)}
						<Typography variant="h5" sx={{mb: 2}}>
							{t("paymentMethodForm.pageHeader")}
						</Typography>
						{cartHasTickets() && (
							<Typography variant="body1" sx={{m: 2}}>
								{
									"Please note, due to limited seating, to reserve your seats, we require payment by credit card online OR you can come in store to purchase your tickets in person by credit, cash or debit. Seats must be purchased prior to event date. We look forward to hosting you!"
								}
							</Typography>
						)}
						<PaymentMethods
							order={order}
							formikProps={formikProps}
							paymentMethods={paymentMethods}
							isDelivery={isDelivery}
							setIsPaymentApproved={setIsPaymentApproved}
						/>
						{requireDeliveryTime && (
							<DeliveryTimeSelector
								field="delivery_time"
								helperText={nextDayHelperText}
								formikProps={formikProps}
							>
								{renderDeliveryTimeOptions(
									deliveryTimes?.times,
									loadingDeliveryTimes,
									errorLoadingDeliveryTimes,
								)}
							</DeliveryTimeSelector>
						)}
						{showPayHQ && (
							<PayHQ
								order={order}
								total={total}
								items={items}
								tip={values.tip}
								onPaymentApproved={(paidAt) => {
									formikProps.setStatus(undefined);

									try {
										handlePaymentApproved(paidAt, values.tip);
									} catch (error) {
										formikProps.setStatus({
											serverError:
												error instanceof Error
													? error.message
													: "Payment was approved, but checkout state could not be updated. Please contact the store.",
										});
									}
								}}
								onPaymentFailed={(error) =>
									formikProps.setStatus({serverError: error})
								}
							/>
						)}
						{formikProps.status?.serverError && (
							<Alert severity="error" sx={{mb: 2}}>
								{formikProps.status.serverError}
							</Alert>
						)}
						<Box textAlign={"end"}>
							<Button
								variant="contained"
								startIcon={
									formikProps.isSubmitting ? (
										<CircularProgress size="12px" aria-label="Loading…" />
									) : (
										<DoneIcon />
									)
								}
								type={"submit"}
								disabled={
									formikProps.isSubmitting ||
									(!order?.paid_at && isCreditCard && !isPaymentApproved)
								}
								color="success"
								size="large"
							>
								{t("paymentMethodForm.completeOrder")}
							</Button>
						</Box>
					</Form>
				);
			}}
		</Formik>
	);
}

const getFormInitialValues = (
	order: IOrderWithCustmAttr | undefined,
	paymentMethods: IPaymentMethod[],
) => {
	const paidAt = order?.paid_at;
	const initialValues: IPaymentMethodFormValues = {
		payment_method_id: paidAt
			? CREDIT_CARD_PAYMENT_METHOD
			: (order?.payment_method_id
				? order.payment_method_id
				: paymentMethods[0]?.payment_method_id || undefined),
		delivery_time: order?.delivery_time ?? "",
		tip: order?.tip !== "0.00" ? order?.tip : "",
	};

	return initialValues;
};

const PaymentMethods = ({
	formikProps,
	paymentMethods,
	isDelivery,
	setIsPaymentApproved,
	order,
}: {
	formikProps: FormikProps<IPaymentMethodFormValues>;
	paymentMethods: IPaymentMethod[];
	isDelivery: boolean;
	setIsPaymentApproved: (isApproved: boolean) => void;
	order: IOrderWithCustmAttr | undefined;
}) => {
	const orderHasShipping = hasShipping(order as IOrderWithCustmAttr);
	const orderPaid = Boolean(order?.paid_at);

	return (
		<Box sx={{mb: 2}}>
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
					value={formikProps.values.payment_method_id}
					onChange={(e) => {
						formikProps.handleChange(e);
						setIsPaymentApproved(false);
						if (formikProps.status?.serverError) {
							formikProps.setStatus(undefined);
						}
					}}
				>
					{paymentMethods.map(({payment_method_id, title}) => {
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
								disabled={orderPaid}
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
					<Box sx={{mb: 2, mt: 2}}>
						<TextField
							label="Tip"
							type="number"
							variant={"outlined"}
							{...fieldAttrs("tip", formikProps)}
							onChange={(e) => {
								formikProps.handleChange(e);
								if (formikProps.status?.serverError) {
									formikProps.setStatus(undefined);
								}
							}}
							disabled={orderPaid}
							helperText={"100% of tip goes to your driver!"}
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
				)}
			</FormControl>
		</Box>
	);
};

const useSavePaymentMethod = (paymentPage: IPaymentPageData) => {
	const {order, total} = useAppSelector((state) => state.app);
	const {onThankYouPage} = useCheckoutConfig();
	const dispatch = useAppDispatch();

	const onSubmit = async (
		values: IPaymentMethodFormValues,
		{setSubmitting, setStatus}: FormikHelpers<IPaymentMethodFormValues>,
	) => {
		const {order: checkoutDataOrder, items} = getCheckoutData() || {};

		if (!order || !checkoutDataOrder || !total) return;

		try {
			const {payment_method_id, tip, delivery_time} = values;

			const selectedPaymentMethod = paymentPage.paymentMethods.find(
				(method) => method.payment_method_id === payment_method_id,
			);

			let updatedOrder: IOrderWithCustmAttr;
			let updatedTotal = {...total};

			if (payment_method_id === CREDIT_CARD_PAYMENT_METHOD) {
				const completedSession = completeCreditCardPaymentOutcome(
					{order: checkoutDataOrder, total},
					{
						paymentMethodId: payment_method_id,
						paymentMethod: selectedPaymentMethod,
						tip,
						deliveryTime: delivery_time,
					},
				);

				updatedOrder = completedSession.order;
				updatedTotal = completedSession.total;
			} else {
				updatedOrder = {
					...checkoutDataOrder,
					paymentMethod: selectedPaymentMethod,
					tip: tip ? parseFloat(tip).toString() : "0",
					payment_method_id: payment_method_id,
					...(delivery_time ? {delivery_time} : {}),
					custom_attrs: {
						...checkoutDataOrder.custom_attrs,
						checkoutCompleted: true,
					},
				} as IOrderWithCustmAttr;

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
			}

			setLocalStorageCheckoutData({
				order: {
					...updatedOrder,
				} as IOrderWithCustmAttr,
				total: updatedTotal,
			});

			dispatch(setOrder(updatedOrder));
			dispatch(setTotal(updatedTotal));

			await onThankYouPage({
				order: updatedOrder,
				total: updatedTotal,
				items: items ?? [],
			});
		} catch (error) {
			console.error("Checkout completion failed:", error);
			setStatus({
				serverError: "Unable to complete your order. Please try again.",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return {
		onSubmit,
	};
};

export interface IPaymentMethodFormValues {
	payment_method_id?: string;
	tip?: string;
	delivery_time?: string;
}
