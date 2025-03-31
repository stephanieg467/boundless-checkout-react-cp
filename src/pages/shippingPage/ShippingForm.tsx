import React from "react";
import {
	IAddress,
	IAddressFields,
	ICheckoutShippingPageData,
	IDetailedOrder,
	IOrder,
	ISetAddressesData,
	ITotal,
	TAddressType,
} from "boundless-api-client";
import { Form, Formik, FormikHelpers } from "formik";
import ExtraErrors from "../../components/ExtraErrors";
import { Button, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { IShippingFormValues, IShippingRate } from "../../types/shippingForm";
import DeliverySelector from "./shippingForm/DeliverySelector";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { useNavigate } from "react-router-dom";
import { addPromise } from "../../redux/actions/xhr";
import { apiErrors2Formik } from "../../lib/formUtils";
import { setOrder, setTotal } from "../../redux/reducers/app";
import AddressesFields from "./shippingForm/AddressesFields";
import {
	hasShipping,
	isPickUpDelivery,
	setOrderShippingRate,
	updateOrderTaxes,
} from "../../lib/shipping";
import { useTranslation } from "react-i18next";
import { RootState } from "../../redux/store";
import { IOrderWithCustmAttr } from "../../types/Order";
import { SHIPPING_DELIVERY_ID } from "../../constants";
import ShippingRatesField from "./shippingForm/ShippingRatesField";

const getFormInitialValues = (
	shippingPage: ICheckoutShippingPageData
): IShippingFormValues => {
	const initialValues: IShippingFormValues = {
		delivery_id: 0,
		shippingRate: '',
		shipping_address: getEmptyAddressFields(shippingPage.shippingAddress),
		billing_address: getEmptyAddressFields(shippingPage.billingAddress),
		billing_address_the_same: false,
	};

	if (!shippingPage.billingAddress) {
		initialValues.billing_address_the_same = true;
	}

	return initialValues;
};

const getEmptyAddressFields = (
	address: IAddress | null = null
): IAddressFields => {
	let first_name,
		last_name,
		company,
		address_line_1,
		address_line_2,
		city,
		state,
		country_id,
		zip,
		phone;
	if (address) {
		({
			first_name,
			last_name,
			company,
			address_line_1,
			address_line_2,
			city,
			state,
			country_id,
			zip,
			phone,
		} = address);
	}

	return {
		first_name: first_name || "",
		last_name: last_name || "",
		company: company || "",
		address_line_1: address_line_1 || "",
		address_line_2: address_line_2 || "",
		city: city || "",
		state: state || "",
		country_id: country_id || 0,
		zip: zip || "",
		phone: phone || "",
	};
};

const useSaveShippingForm = ({
	shippingPage,
}: {
	shippingPage: ICheckoutShippingPageData;
}) => {
	const { api, order } = useAppSelector((state) => state.app);
	const cartItems = useAppSelector((state: RootState) => state.app.items);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const onSubmit = (
		values: IShippingFormValues,
		{ setSubmitting, setErrors }: FormikHelpers<IShippingFormValues>
	) => {
		if (!api || !order) return;
		
		const {
			delivery_id,
			shippingRate,
			shipping_address,
			billing_address,
			billing_address_the_same,
		} = values;
		
		let total: ITotal;

		const promise = Promise.resolve()
			.then(() => {
				const data: ISetAddressesData = { order_id: order.id };
				if (!isPickUpDelivery(delivery_id, shippingPage.options.delivery)) {
					data.shipping_address = shipping_address;
					data.billing_address_the_same = billing_address_the_same;
					data.required_addresses = [TAddressType.shipping];

					if (!billing_address_the_same) {
						data.required_addresses.push(TAddressType.billing);
						data.billing_address = billing_address;
					}

					return api.customerOrder.setAddresses(data);
				}
				return;
			})
			.then(() => {
				return api.checkout.setDeliveryMethod(order.id, delivery_id);
			})
			.then(async ({ order, total: deliveryMethodTotal }) => {
				total = deliveryMethodTotal;
				
				const orderShippingRate = await setOrderShippingRate(
					order as IDetailedOrder,
					cartItems,
					shippingRate
				);
				if (hasShipping(order) && orderShippingRate && !('price-quotes' in orderShippingRate)) {
					const error = { response: { data: [{ field: 'shippingRate', message: 'Unable to set shipping rate' }] } };
					throw error;
				}
				return orderShippingRate;
			})
			.then((shippingRate: IShippingRate | null) => {
				if (shippingRate) {
					const priceQuote = shippingRate["price-quotes"]["price-quote"];
					const singlePriceQuote = Array.isArray(priceQuote)
						? priceQuote[0]
						: priceQuote;
					total.servicesSubTotal.price =
						singlePriceQuote["price-details"]["base"].toString();
				}

				return api.customerOrder.getOrder(order.id);
			})
			.then((order) => {
				// @todo: check if order has beverages and if so apply bottle tax.
				updateOrderTaxes(order as IOrderWithCustmAttr, total);
				order.service_total_price = total.servicesSubTotal.price;
				order.services[0].total_price = total.servicesSubTotal.price;
				dispatch(setOrder(order as IOrder));
				dispatch(setTotal(total));

				navigate("/payment");
			})
			.catch(({ response: { data } }) => {
				setErrors(apiErrors2Formik(data));
			})
			.finally(() => setSubmitting(false));
		dispatch(addPromise(promise));
	};

	return {
		onSubmit,
	};
};

export default function ShippingForm({
	shippingPage,
}: {
	shippingPage: ICheckoutShippingPageData;
}) {	
	const { onSubmit } = useSaveShippingForm({ shippingPage });
	const { t } = useTranslation();

	return (
		<Formik
			initialValues={getFormInitialValues(shippingPage)}
			onSubmit={onSubmit}
		>
			{(formikProps) => {
				const { values } = formikProps;
				values.delivery_id = Number(values.delivery_id);
				
				const { delivery_id, shippingRate } = values;
				
				return (
					<Form className={"bdl-shipping-form"}>
						{Object.keys(formikProps.errors).length > 0 && (
							<ExtraErrors
								excludedFields={Object.keys(formikProps.initialValues)}
								errors={formikProps.errors}
							/>
						)}
						<Typography variant="h5" sx={{ m: 2 }}>
							{t("shippingForm.pageHeader")}
						</Typography>
						<DeliverySelector options={shippingPage.options} />
						{!isPickUpDelivery(
							delivery_id,
							shippingPage.options.delivery
						) && <AddressesFields shippingPage={shippingPage} />}
						{delivery_id === SHIPPING_DELIVERY_ID && (
							<ShippingRatesField />
						)}
						<Box textAlign={"end"}>
							<Button
								variant="contained"
								type={"submit"}
								disabled={
									formikProps.isSubmitting || !delivery_id || (delivery_id === SHIPPING_DELIVERY_ID && !shippingRate)
								}
							>
								{t("shippingForm.continueToPayment")}
							</Button>
						</Box>
					</Form>
				);
			}}
		</Formik>
	);
}
