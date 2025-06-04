import React, { useEffect } from "react";
import Paper from "@mui/material/Paper";
import OrderItems from "./components/orderInfo/OrderItems";
import Typography from "@mui/material/Typography";
import Loading from "./components/Loading";
import { store } from "./redux/store";
import { Provider } from "react-redux";
import { useAppSelector } from "./hooks/redux";
import {
	setIsInited,
} from "./redux/reducers/app";
import { useTranslation } from "react-i18next";
import { IOrderWithCustmAttr } from "./types/Order";
import { getCheckoutData } from "./hooks/checkoutData";
import { DELIVERY_ID } from "./constants";

export default function BoundlessOrderInfo({
	...restProps
}: BoundlessOrderInfoProps) {
	useEffect(() => {
		store.dispatch(setIsInited(true));
	}, []);

	return (
		<React.StrictMode>
			<Provider store={store}>
				<OrderInfo {...restProps} />
			</Provider>
		</React.StrictMode>
	);
}

export interface BoundlessOrderInfoProps {
	showItems?: boolean;
	showStatus?: boolean;
}

const OrderInfo = ({
	showItems = true,
	showStatus = true,
}: BoundlessOrderInfoProps) => {
	const isInited = useAppSelector((state) => state.app.isInited);
	const checkoutData = getCheckoutData();
	const {order, total, items} = checkoutData ?? {};
	const { t } = useTranslation();
	const isDelivery = order?.services?.some(
			(service) => service.service_id === DELIVERY_ID
		);

	if (!order || !isInited) return <Loading />;

	return (
		<div className="bdl-order-summary">
			{showStatus && (
				<div>
					<Typography variant="subtitle1" gutterBottom>
						{t("orderInfo.orderId", { id: order.id })}
					</Typography>
					<Typography variant="subtitle1" gutterBottom>
						{t("orderInfo.orderStatus", { status: "Submitted" })}
					</Typography>
					{!isDelivery && (
						<Typography variant="subtitle1" gutterBottom>
							{t("orderInfo.paymentStatusPayInStore")}
						</Typography>
					)}
					{isDelivery && order.paid_at && (
						<Typography variant="subtitle1" gutterBottom>
							{t("orderInfo.paymentStatusPaid")}
						</Typography>
					)}
				</div>
			)}
			<Paper>
				{showItems && order && items && total && <OrderItems items={items} total={total} order={order as IOrderWithCustmAttr} />}
			</Paper>
		</div>
	);
};
