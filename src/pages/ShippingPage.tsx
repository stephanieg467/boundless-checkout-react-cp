import React, { useEffect, useState } from "react";
import CheckoutLayout from "../layout/CheckoutLayout";
import useInitCheckoutByCart from "../hooks/initCheckout";
import Loading from "../components/Loading";
import { useAppSelector } from "../hooks/redux";
import { ICheckoutShippingPageData } from "boundless-api-client";
import ShippingForm from "./shippingPage/ShippingForm";
import { useTranslation } from "react-i18next";
import {
	DELIVERY_INFO,
	SELF_PICKUP_INFO,
	SHIPPING_DELIVERY_INFO,
} from "../constants";

const useInitShippingPage = () => {
	const { isInited } = useInitCheckoutByCart();
	const [shippingPage, setShippingPage] =
		useState<null | ICheckoutShippingPageData>(null);
	const { order } = useAppSelector((state) => state.app);

	useEffect(() => {
		if (order && !shippingPage) {
			if (order.customer) {
				const shippingPageData = {
					shippingAddress:
						order.customer.addresses.find(
							(address) => address.type === "shipping"
						) || null,
					billingAddress:
						order.customer.addresses.find(
							(address) => address.type === "billing"
						) || null,
					billingAddressTheSame: false,
					options: {
						country: [
							{
								country_id: 0,
								code: "CA",
								title: "Canada",
							},
						],
						delivery: [SELF_PICKUP_INFO, DELIVERY_INFO, SHIPPING_DELIVERY_INFO],
					},
					person: order.customer,
					orderServiceDelivery: null,
				};
				setShippingPage(shippingPageData);
			}
		}
	}, [order]); //eslint-disable-line

	return {
		isInited,
		shippingPage,
	};
};

export default function ShippingPage() {
	const { isInited, shippingPage } = useInitShippingPage();
	const { t } = useTranslation();

	useEffect(() => {
		document.title = t("shippingForm.pageTitle");
	}, []); //eslint-disable-line

	if (!isInited) {
		return <Loading />;
	}

	return (
		<CheckoutLayout>
			{shippingPage ? (
				<ShippingForm shippingPage={shippingPage} />
			) : (
				<Loading />
			)}
		</CheckoutLayout>
	);
}
