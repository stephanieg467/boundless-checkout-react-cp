import React, { useEffect, useState } from "react";
import CheckoutLayout from "../layout/CheckoutLayout";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import useInitCheckoutByCart from "../hooks/initCheckout";
import Loading from "../components/Loading";
import PaymentMethodForm from "./paymentPage/PaymentMethodForm";
import { useTranslation } from "react-i18next";
import { CREDIT_CARD_PAYMENT_METHOD, PAY_IN_STORE_PAYMENT_METHOD } from "../constants";

export default function PaymentPage() {
	const { isInited, paymentPage } = useInitPaymentPage();
	const { t } = useTranslation();

	useEffect(() => {
		document.title = t("paymentMethodForm.pageTitle");
	}, []); //eslint-disable-line

	if (!isInited) {
		return <Loading />;
	}

	return (
		<CheckoutLayout>
			{paymentPage ? (
				<PaymentMethodForm paymentPage={paymentPage} />
			) : (
				<Loading />
			)}
		</CheckoutLayout>
	);
}

export interface IPaymentMethod {
	payment_method_id: number | string;
	title: string;
}

export interface IPaymentPageData {
	paymentMethods: IPaymentMethod[];
}

const useInitPaymentPage = () => {
	const { isInited } = useInitCheckoutByCart();
	const { order } = useAppSelector((state) => state.app);
	const dispatch = useAppDispatch();
	const [paymentPage, setPaymentPage] = useState<IPaymentPageData | null>(null);

	useEffect(() => {
		if (isInited && order && !paymentPage) {
			const paymentPageData = {
				paymentMethods: [{
					payment_method_id: CREDIT_CARD_PAYMENT_METHOD,
					title: "Credit Card",
				}] as IPaymentMethod[]
			} as IPaymentPageData;
			
			if (order.services?.find((service) => service.serviceDelivery?.title === "Self Pickup")) {
				paymentPageData.paymentMethods.push({
					payment_method_id: PAY_IN_STORE_PAYMENT_METHOD,
					title: "Pay in store",
				});
			}
			setPaymentPage(paymentPageData);
		}
	}, [isInited, order, dispatch]); //eslint-disable-line

	return {
		isInited,
		paymentPage,
	};
};
