import React from "react";
import {
	IAddress,
	IAddressFields,
	ICheckoutShippingPageData,
	TCheckoutStep,
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
import { addFilledStep, setOrder, setTotal } from "../../redux/reducers/app";
import AddressesFields from "./shippingForm/AddressesFields";
import { isPickUpDelivery, getOrderShippingRate } from "../../lib/shipping";
import { useTranslation } from "react-i18next";
import { RootState } from "../../redux/store";
import { IOrderWithCustmAttr } from "../../types/Order";
import {
	DELIVERY_COST,
	DELIVERY_ID,
	DELIVERY_INFO,
	SELF_PICKUP_ID,
	SELF_PICKUP_INFO,
	SHIPPING_DELIVERY_ID,
	SHIPPING_DELIVERY_INFO,
} from "../../constants";
import ShippingRatesField from "./shippingForm/ShippingRatesField";
import { v4 } from "uuid";
import { setLocalStorageCheckoutData } from "../../hooks/checkoutData";

const getFormInitialValues = (
	shippingPage: ICheckoutShippingPageData
): IShippingFormValues => {
	const { order } = useAppSelector((state) => state.app);

	const initialValues: IShippingFormValues = {
		delivery_id:
			order?.services &&
			order.services.length > 0 &&
			order.services[0].service_id != null
				? order.services[0].service_id
				: SELF_PICKUP_ID,
		serviceCode: "",
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
		// country_id: country_id || 0,
		// @todo: currently only shipping in Canada.
		country_id: 40,
		zip: zip || "",
		phone: phone || "",
	};
};

const useSaveShippingForm = ({
	shippingPage,
}: {
	shippingPage: ICheckoutShippingPageData;
}) => {
	const { order, total } = useAppSelector((state) => state.app);
	const cartItems = useAppSelector((state: RootState) => state.app.items);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const onSubmit = (
		values: IShippingFormValues,
		{ setSubmitting, setErrors }: FormikHelpers<IShippingFormValues>
	) => {
		if (!order) return;

		const {
			delivery_id,
			serviceCode,
			shipping_address,
			billing_address,
			billing_address_the_same,
		} = values;

		const service = (delivery_id: number, rate: IShippingRate | null) => {
			switch (delivery_id) {
				case SHIPPING_DELIVERY_ID:
					const shippingPriceQuote = rate
						? rate["price-quotes"]["price-quote"]
						: null;
					const shippingRate = Array.isArray(shippingPriceQuote)
						? shippingPriceQuote[0]["price-details"]["base"].toString()
						: shippingPriceQuote
						? shippingPriceQuote["price-details"]["base"].toString()
						: "";

					return {
						order_service_id: v4(),
						service_id: SHIPPING_DELIVERY_ID,
						qty: 1,
						total_price: shippingRate,
						item_price_id: "",
						is_delivery: true,
						serviceDelivery: {
							delivery_id: SHIPPING_DELIVERY_ID,
							title: "Shipping",
							text_info: null,
							data: null,
							delivery: SHIPPING_DELIVERY_INFO,
						},
					};

				case DELIVERY_ID:
					return {
						order_service_id: v4(),
						service_id: DELIVERY_ID,
						qty: 1,
						total_price: DELIVERY_COST,
						item_price_id: "",
						is_delivery: true,
						serviceDelivery: {
							delivery_id: DELIVERY_ID,
							title: "Delivery",
							text_info: null,
							data: null,
							delivery: DELIVERY_INFO,
						},
					};

				case SELF_PICKUP_ID:
					return {
						order_service_id: v4(),
						service_id: SELF_PICKUP_ID,
						qty: 1,
						total_price: "0.00",
						item_price_id: "",
						is_delivery: false,
						serviceDelivery: {
							delivery_id: SELF_PICKUP_ID,
							title: "Self Pickup",
							text_info: null,
							data: null,
							delivery: SELF_PICKUP_INFO,
						},
					};

				default:
					return null;
			}
		};

		const promise = Promise.resolve()
			.then(() => {
				if (!order) return;

				const addresses = [];

				if (!isPickUpDelivery(delivery_id, shippingPage.options.delivery)) {
					addresses.push({
						id: v4(),
						type: "shipping",
						is_default: true,
						first_name: order.customer?.first_name,
						last_name: order.customer?.last_name,
						company: null,
						address_line_1: shipping_address?.address_line_1,
						address_line_2: shipping_address?.address_line_2,
						city: shipping_address?.city,
						state: shipping_address?.state,
						country_id: 0, // Canada
						zip: shipping_address?.zip,
						phone: shipping_address?.phone,
						created_at: new Date().toISOString(),
						vwCountry: null,
					});

					if (!billing_address_the_same) {
						addresses.push({
							id: v4(),
							type: "billing",
							is_default: false,
							first_name: billing_address?.first_name,
							last_name: billing_address?.last_name,
							company: null,
							address_line_1: billing_address?.address_line_1,
							address_line_2: billing_address?.address_line_2,
							city: billing_address?.city,
							state: billing_address?.state,
							country_id: 0, // Canada
							zip: billing_address?.zip,
							phone: billing_address?.phone,
							created_at: new Date().toISOString(),
							vwCountry: null,
						});
					}
				}

				return {
					order: {
						...order,
						customer: {
							...order.customer,
							id: order.customer?.id ?? "",
							addresses: addresses,
						},
					} as IOrderWithCustmAttr,
				};
			})
			.then(async (result) => {
				if (!result) throw new Error("Order data is missing");
				const { order } = result;

				const orderShippingRate = await getOrderShippingRate(
					order,
					cartItems,
					serviceCode
				);

				if (
					delivery_id === SHIPPING_DELIVERY_ID &&
					orderShippingRate &&
					!("price-quotes" in orderShippingRate)
				) {
					const error = {
						response: {
							data: [
								{
									field: "serviceCode",
									message: "Unable to set shipping rate",
								},
							],
						},
					};
					throw error;
				}

				return { orderShippingRate, order };
			})
			.then((result) => {
				if (!result) throw new Error("Order data is missing");

				const { orderShippingRate, order } = result;
				const shippingPriceQuote = orderShippingRate
					? orderShippingRate["price-quotes"]["price-quote"]
					: null;
				let shippingTaxes = 0;
				let shippingRate = delivery_id === DELIVERY_ID ? DELIVERY_COST : "0.00";

				if (shippingPriceQuote) {
					const shippingPriceQuoteValue = Array.isArray(shippingPriceQuote)
						? shippingPriceQuote[0]["price-details"]
						: shippingPriceQuote["price-details"];
					shippingRate = shippingPriceQuoteValue["base"].toString();

					shippingTaxes =
						shippingPriceQuoteValue.taxes.gst + shippingPriceQuoteValue.taxes.pst+ shippingPriceQuoteValue.taxes.hst;
				}

				const updatedOrder = {
					...order,
					total_price: (Number(order.total_price) + Number(shippingRate) + shippingTaxes).toString(),
					tax_amount: (Number(order.tax_amount) + shippingTaxes).toString(),
					service_total_price: shippingRate,
					servicesSubTotal: {
						qty: 1,
						price: shippingRate,
					},
					customer: {
						...order.customer,
						email: order.customer?.email ?? null,
					},
					services: [service(delivery_id, orderShippingRate)],
					custom_attrs: {
						...order.custom_attrs,
						serviceCode: serviceCode,
						shippingRate: shippingRate,
						shippingTax: shippingTaxes,
					},
				};

				if (total) {
					const initialTaxes = total.tax.totalTaxAmount;

					const updatedTotal = {
						...total,
						price: (Number(order.total_price) + Number(shippingRate) + shippingTaxes).toString(),
						tax: {
							...total.tax,
							shipping: {
								...total.tax.shipping,
								shippingTaxes: shippingTaxes.toString(),
							} as any,
							totalTaxAmount: (Number(initialTaxes) + shippingTaxes).toString(),
						},
						servicesSubTotal: {
							...total.servicesSubTotal,
							price: shippingRate,
						},
					};

					setLocalStorageCheckoutData({
						order: updatedOrder as unknown as IOrderWithCustmAttr,
						total: updatedTotal,
					});
					
					console.log("updatedOrder", updatedOrder);
					dispatch(setOrder(updatedOrder as unknown as IOrderWithCustmAttr));
					dispatch(setTotal(updatedTotal));
					dispatch(addFilledStep({ step: TCheckoutStep.shippingMethod }));
				}

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

				const { delivery_id, serviceCode } = values;

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
						{!isPickUpDelivery(delivery_id, shippingPage.options.delivery) && (
							<AddressesFields shippingPage={shippingPage} />
						)}
						{delivery_id === SHIPPING_DELIVERY_ID && <ShippingRatesField />}
						<Box textAlign={"end"}>
							<Button
								variant="contained"
								type={"submit"}
								disabled={
									formikProps.isSubmitting ||
									!delivery_id ||
									(delivery_id === SHIPPING_DELIVERY_ID && !serviceCode)
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
