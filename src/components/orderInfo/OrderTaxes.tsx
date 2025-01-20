import React from 'react';
import useFormatCurrency from '../../hooks/useFormatCurrency';
import {useAppSelector} from '../../hooks/redux';
import {Grid} from '@mui/material';
import { hasShipping } from '../../lib/shipping';
import { IOrderWithCustmAttr } from '../../types/Order';

export default function OrderTaxes({order}: {order: IOrderWithCustmAttr}) {
	const {formatCurrency} = useFormatCurrency();
	const taxSettings = useAppSelector((state) => state.app.taxSettings);
		const orderHasShipping = hasShipping(order);
	
		const shippingTaxes = orderHasShipping && order.custom_attrs?.shippingTax ? Number(order.custom_attrs?.shippingTax) : 0;
		const initialTaxes = order.tax_amount ? order.tax_amount : 0;
		const totalTaxAmount = (Number(initialTaxes) + shippingTaxes).toString();

	return (
		<div className='bdl-order-items__service-row'>
			<h5 className='bdl-order-items__service-heading'>
				{taxSettings && taxSettings.taxTitle}
			</h5>
			<Grid container style={{justifyContent: 'flex-end'}}>
				<Grid item sm={2} xs={12} className='bdl-order-items__service-cell'>
					{order.tax_amount && formatCurrency(totalTaxAmount)}
				</Grid>
			</Grid>
		</div>
	);
}