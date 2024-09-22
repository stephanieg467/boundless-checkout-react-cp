import React from "react";
import {
	IAddress,
	IAddressFields,
	ICheckoutShippingPageData,
	ISetAddressesData,
	TAddressType,
} from "boundless-api-client";
import { Form, Formik, FormikHelpers } from "formik";
import ExtraErrors from "../../components/ExtraErrors";
import { Button, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { IShippingFormValues } from "../../types/shippingForm";
import DeliverySelector from "./shippingForm/DeliverySelector";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { useNavigate } from "react-router-dom";
import { addPromise } from "../../redux/actions/xhr";
import { apiErrors2Formik } from "../../lib/formUtils";
import { setOrder, setTotal } from "../../redux/reducers/app";
import AddressesFields from "./shippingForm/AddressesFields";
import { isPickUpDelivery } from "../../lib/shipping";
import { useTranslation } from "react-i18next";
import { IUpdateOrderRequest } from "boundless-api-client/dist/endpoints/adminOrder";
import { canadaShippingRate } from "../../lib/canadaShipping";

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
			{(formikProps) => (
				<Form className={"bdl-shipping-form"}>
					{Object.keys(formikProps.errors).length > 0 && (
						<ExtraErrors
							excludedFields={...Object.keys(formikProps.initialValues)}
							errors={formikProps.errors}
						/>
					)}
					<Typography variant="h5" mb={2}>
						{t("shippingForm.pageHeader")}
					</Typography>
					<DeliverySelector options={shippingPage.options} />
					<AddressesFields shippingPage={shippingPage} />
					<Box textAlign={"end"}>
						<Button
							variant="contained"
							type={"submit"}
							disabled={
								formikProps.isSubmitting || !formikProps.values.delivery_id
							}
						>
							{t("shippingForm.continueToPayment")}
						</Button>
					</Box>
				</Form>
			)}
		</Formik>
	);
}

const getFormInitialValues = (
	shippingPage: ICheckoutShippingPageData
): IShippingFormValues => {
	const initialValues: IShippingFormValues = {
		delivery_id:
			shippingPage.orderServiceDelivery?.serviceDelivery?.delivery_id || 0,
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
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const onSubmit = (
		values: IShippingFormValues,
		{ setSubmitting, setErrors }: FormikHelpers<IShippingFormValues>
	) => {
		if (!api || !order) return;
		const {
			delivery_id,
			shipping_address,
			billing_address,
			billing_address_the_same,
		} = values;

		const promise = Promise.resolve()
			.then(async () => {
				const data: ISetAddressesData = { order_id: order.id };
				if (!isPickUpDelivery(delivery_id, shippingPage.options.delivery)) {
					data.shipping_address = shipping_address;
					data.billing_address_the_same = billing_address_the_same;
					data.required_addresses = [TAddressType.shipping];

					if (!billing_address_the_same) {
						data.required_addresses.push(TAddressType.billing);
						data.billing_address = billing_address;
					}
				} else {
					data.required_addresses = [TAddressType.billing];
					data.billing_address = billing_address;
				}

				// 	const orderDotServices = [
				// 		{
				// 				"order_service_id": 163,
				// 				"service_id": null,
				// 				"qty": 1,
				// 				"total_price": "10.00",
				// 				"item_price_id": 890,
				// 				"is_delivery": true,
				// 				"serviceDelivery": {
				// 						"delivery_id": 25,
				// 						"title": null,
				// 						"text_info": null,
				// 						"data": null,
				// 						"delivery": {
				// 								"delivery_id": 25,
				// 								"title": "Canada Post",
				// 								"description": "Shipping cost will be provided shortly",
				// 								"alias": null,
				// 								"img": null,
				// 								"shipping_id": null,
				// 								"shipping_config": {
				// 										"price": 10
				// 								},
				// 								"free_shipping_from": null,
				// 								"calc_method": "single",
				// 								"created_at": "2024-04-20 01:36:50.641454-04",
				// 								"shipping": null
				// 						}
				// 				}
				// 		}
				// ]

				if (
					order.services?.find((service) => {
						service?.serviceDelivery?.delivery?.title === "Canada Post";
					})
				) {
					const zip = shipping_address?.zip ?? "";
					// const shippingRate = canadaShippingRate(zip);
					await api.adminOrder.updateOrder(order.id, {
						delivery_id: delivery_id,
						delivery_rate: 15,
					} as unknown as IUpdateOrderRequest);
				}

				return api.customerOrder.setAddresses(data);
			})
			.then(() => {
				return api.checkout.setDeliveryMethod(order.id, delivery_id);
			})
			.then(({ order, total }) => {
				dispatch(setOrder(order));
				// @todo: I think here is where need to update total services subtotal so that price is from canada post api.
				dispatch(setTotal(total));

				navigate("/payment");
			})
			.catch(({ response: { data } }) => setErrors(apiErrors2Formik(data)))
			.finally(() => setSubmitting(false));
		dispatch(addPromise(promise));
	};

	return {
		onSubmit,
	};
};
