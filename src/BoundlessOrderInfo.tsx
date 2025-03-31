import React, {useEffect, useState} from 'react';
import {BoundlessClient, IDetailedOrder, TPaymentGatewayAlias, ILocaleSettings, ISystemTax} from 'boundless-api-client';
import Paper from '@mui/material/Paper';
import OrderItems from './components/orderInfo/OrderItems';
import Typography from '@mui/material/Typography';
import PayButton from './components/PayButton';
import Loading from './components/Loading';
import {store} from './redux/store';
import {Provider} from 'react-redux';
import {useAppDispatch, useAppSelector} from './hooks/redux';
import {setApi, setIsInited, setLocaleSettings, setTaxSettings} from './redux/reducers/app';
import {useTranslation} from 'react-i18next';
import { IOrderWithCustmAttr } from './types/Order';
import addImagesToItems from './lib/addImagesToItems';

export default function BoundlessOrderInfo({api, ...restProps}: BoundlessOrderInfoProps) {
	useEffect(() => {
		if (api) {
			store.dispatch(setApi({api}));
			store.dispatch(setIsInited(true));
		}
	}, [api]);

	return (
		<React.StrictMode>
			<Provider store={store}>
				<OrderInfo {...restProps} />
			</Provider>
		</React.StrictMode>
	);
}

export interface BoundlessOrderInfoProps {
	orderId: string;
	api: BoundlessClient;
	showItems?: boolean;
	showStatus?: boolean;
	showPayButton?: boolean;
	onError?: (error: any) => void;
}

const OrderInfo = ({orderId, showItems = true, showPayButton = true, showStatus = true, onError}: Omit<BoundlessOrderInfoProps, 'api'>) => {
	const api = useAppSelector((state) => state.app.api);
	const isInited = useAppSelector((state) => state.app.isInited);
	const [order, setOrder] = useState<IDetailedOrder | null>(null);
	const dispatch = useAppDispatch();
	const {t} = useTranslation();

	useEffect(() => {
		if (isInited && api) {
			api.system.fetchSettings(['system.locale', 'system.tax'])
				.then((data) => {
					dispatch(setLocaleSettings(data['system.locale'] as ILocaleSettings));
					dispatch(setTaxSettings(data['system.tax'] as ISystemTax));
					return api.customerOrder.getOrder(orderId);
				})
				.then(async (data) => {
					const {items} = data;
					const itemsWithImages = await addImagesToItems(items, api!);
					setOrder({...data, items: itemsWithImages});
				})
				.catch(err => {
					console.error(err);

					if (onError) {
						onError(err);
					} else throw err;
				})
			;
		}
	}, [api, isInited, onError, dispatch, orderId]);

	if (!order || !api || !isInited) return <Loading />;

	return (
		<div className='bdl-order-summary'>
			{(showPayButton && !order.paid_at && order.paymentMethod?.gateway_alias === TPaymentGatewayAlias.paypal) &&
				<PayButton orderId={orderId} onError={onError} />
			}
			{showStatus &&
				<div>
					<Typography variant="subtitle1" gutterBottom>{t('orderInfo.orderId', {id: order.order_id})}</Typography>
					<Typography variant="subtitle1" gutterBottom>{t('orderInfo.orderStatus', {status: order.status?.title})}</Typography>
					{order.paid_at && <Typography variant="subtitle1" gutterBottom>{t('orderInfo.paymentStatusPaid')}</Typography>}
				</div>}
			<Paper>
				{showItems && <OrderItems order={order as IOrderWithCustmAttr} />}
			</Paper>
		</div>
	);
};