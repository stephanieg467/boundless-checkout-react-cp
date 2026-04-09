import { Form, Formik, FormikHelpers } from "formik";
import { Box, Button, Typography } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import {
	addFilledStep,
	setCurrentStep,
	setOrder,
} from "../../redux/reducers/app";
import { TCheckoutStep } from "../../types/common";
import {
	getCheckoutData,
	setLocalStorageCheckoutData,
} from "../../hooks/checkoutData";
import { IOrderWithCustmAttr } from "../../types/Order";
import { useDeliveryTimes } from "../../hooks/useDeliveryTimes";
import {
	DeliveryTimesWithDropShip,
	getNextTwoBusinessDaysFormatted,
} from "../../lib/deliveryTimes";
import {
	ordersDropShippingItems,
	ordersRegularItems,
} from "../../lib/products";
import { hasDeliveryId } from "../../lib/shipping";
import { DELIVERY_ID, SELF_PICKUP_ID } from "../../constants";
import { DeliveryTimeSelector } from "./helpers";
import ExtraErrors from "../../components/ExtraErrors";

const hasDropShipTimes = (data: unknown): data is DeliveryTimesWithDropShip =>
	!!data && typeof data === "object" && "dropShipTimes" in data;

export const renderDeliveryTimeOptions = (
	times: string[] | undefined,
	isLoading: boolean,
	hasError: boolean,
) => (
	<>
		<option value=""></option>
		{isLoading ? (
			<option disabled value="">
				{"Loading delivery times..."}
			</option>
		) : !hasError && times ? (
			times.map((t, idx) => (
				<option key={idx} value={t}>
					{t}
				</option>
			))
		) : (
			<option disabled>
				{
					"Error loading delivery times. Please contact info@cannabis-cottage.ca."
				}
			</option>
		)}
	</>
);

export interface IDeliveryDetailsFormValues {
	delivery_time: string;
	drop_ship_delivery_time?: string;
}

export const makeValidateDeliveryDetailsForm =
	(hasRegularItems: boolean, hasDropShipItems: boolean, isDelivery: boolean) =>
	(values: IDeliveryDetailsFormValues) => {
		const errors: Partial<Record<keyof IDeliveryDetailsFormValues, string>> =
			{};
		if (isDelivery) {
			if (hasRegularItems && !values.delivery_time) {
				errors.delivery_time = "Delivery time is required";
			}
			if (hasDropShipItems && !values.drop_ship_delivery_time) {
				errors.drop_ship_delivery_time = "Drop-ship delivery time is required";
			}
		}
		return errors;
	};

const useSaveDeliveryDetails = () => {
	const dispatch = useAppDispatch();
	const { order, items } = useAppSelector((state) => state.app);

	const regularItems = ordersRegularItems(items ?? []);
	const hasRegularItems = regularItems.length > 0;
	const dropShipItems = ordersDropShippingItems(items ?? []);
	const hasDropShipItems = dropShipItems.length > 0;

	const onSubmit = (
		values: IDeliveryDetailsFormValues,
		{ setSubmitting, setErrors }: FormikHelpers<IDeliveryDetailsFormValues>,
	) => {
		const { order: checkoutDataOrder, total } = getCheckoutData() || {};
		if (!order || !checkoutDataOrder || !total) {
			setErrors({
				_error: "No order found. Please return to menu and try again.",
			} as any);
			setSubmitting(false);
			return;
		}

		const updatedOrder: IOrderWithCustmAttr = {
			...checkoutDataOrder,
			...(hasRegularItems && { delivery_time: values.delivery_time }),
			...(hasDropShipItems && {
				drop_ship_delivery_time: values.drop_ship_delivery_time,
			}),
		};

		setLocalStorageCheckoutData({ order: updatedOrder, total });
		dispatch(setOrder(updatedOrder));
		dispatch(addFilledStep({ step: TCheckoutStep.deliveryDetails }));
		dispatch(setCurrentStep(TCheckoutStep.paymentMethod));
		setSubmitting(false);
	};

	return {
		onSubmit,
		hasRegularItems,
		hasDropShipItems,
		dropShipItems,
		regularItems,
	};
};

export default function DeliveryDetailsForm() {
	const {
		onSubmit,
		hasRegularItems,
		hasDropShipItems,
		dropShipItems,
		regularItems,
	} = useSaveDeliveryDetails();
	const { order } = useAppSelector((state) => state.app);
	const {
		isLoading: loadingDeliveryTimes,
		isError: errorLoadingDeliveryTimes,
		data: deliveryTimes,
	} = useDeliveryTimes({
		returnTimeForTodayAndTwoDaysFromNow: hasDropShipItems,
	});
	const isPickup = !!(order && hasDeliveryId(order, SELF_PICKUP_ID));
	const isDelivery = !!(order && hasDeliveryId(order, DELIVERY_ID));
	const isShipping = !isPickup && !isDelivery;

	const initialValues: IDeliveryDetailsFormValues = {
		delivery_time: hasRegularItems ? (order?.delivery_time ?? "") : "",
		...(hasDropShipItems && {
			drop_ship_delivery_time: order?.drop_ship_delivery_time ?? "",
		}),
	};

	const nextDayHelperText = deliveryTimes?.isNextDay
		? "NOTE: Delivery is closed for the day; your order will be delivered tomorrow."
		: "Will be delivered today.";

	const dropShipDateLabel = hasDropShipTimes(deliveryTimes)
		? deliveryTimes.dropShipTimes.date
		: "";

	return (
		<Formik
			initialValues={initialValues}
			onSubmit={onSubmit}
			validate={makeValidateDeliveryDetailsForm(
				hasRegularItems,
				hasDropShipItems,
				isDelivery,
			)}
			validateOnChange={false}
		>
			{(formikProps) => (
				<Form className={"bdl-delivery-details-form"}>
					{Object.keys(formikProps.errors).length > 0 && (
						<ExtraErrors
							excludedFields={Object.keys(formikProps.initialValues)}
							errors={formikProps.errors}
						/>
					)}
					<Typography variant="h5" sx={{ mb: 2 }}>
						{"Delivery details"}
					</Typography>

					{(hasRegularItems && isDelivery) && (
						<DeliveryTimeSelector
							items={regularItems}
							field={"delivery_time"}
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
					{hasDropShipItems && isDelivery && (
						<DeliveryTimeSelector
							items={dropShipItems}
							field={"drop_ship_delivery_time"}
							helperText={
								dropShipDateLabel
									? `Will be delivered on ${dropShipDateLabel}`
									: ""
							}
							formikProps={formikProps}
						>
							{renderDeliveryTimeOptions(
								hasDropShipTimes(deliveryTimes)
									? deliveryTimes.dropShipTimes.times
									: undefined,
								loadingDeliveryTimes,
								errorLoadingDeliveryTimes,
							)}
						</DeliveryTimeSelector>
					)}
					{(hasRegularItems && isPickup) && (
						<Box sx={{ mb: 2 }}>
							<Typography
								variant="subtitle1"
								sx={{ mb: 1, fontWeight: "bold" }}
							>
								{"Same day pickup for:"}
							</Typography>
							<ul>
								{regularItems.map((item, i) => {
									return <li key={i}>{item.product.Name}</li>;
								})}
							</ul>
						</Box>
					)}
					{hasDropShipItems && isPickup && (
						<Box sx={{ mb: 2 }}>
							<Typography
								variant="subtitle1"
								sx={{ mb: 1, fontWeight: "bold" }}
							>
								{`${getNextTwoBusinessDaysFormatted()} pickup for:`}
							</Typography>
							<ul>
								{dropShipItems.map((item, i) => {
									return <li key={i}>{item.product.Name}</li>;
								})}
							</ul>
						</Box>
					)}
					{isShipping && (
						<Box sx={{ mb: 2 }}>
							<Typography
								variant="subtitle1"
								sx={{ mb: 1, fontWeight: "bold" }}
							>
								{"Expected delivery time in 1-3 business days for:"}
							</Typography>
							<ul>
								{regularItems.concat(dropShipItems).map((item, i) => {
									return <li key={i}>{item.product.Name}</li>;
								})}
							</ul>
						</Box>
					)}

					<Box textAlign={"end"}>
						<Button
							variant="contained"
							startIcon={<DoneIcon />}
							type={"submit"}
							disabled={formikProps.isSubmitting}
							color="success"
							size="large"
						>
							{"Continue to payment"}
						</Button>
					</Box>
				</Form>
			)}
		</Formik>
	);
}
