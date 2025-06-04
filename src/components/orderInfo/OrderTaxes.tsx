import React from 'react';
import useFormatCurrency from '../../hooks/useFormatCurrency';
import {Grid} from '@mui/material';
import { IOrderWithCustmAttr } from '../../types/Order';

export default function OrderTaxes({order}: {order: IOrderWithCustmAttr}) {
	const {formatCurrency} = useFormatCurrency();

	return (
		<div className='bdl-order-items__service-row'>
			<h5 className='bdl-order-items__service-heading'>
				Tax
			</h5>
			<Grid container style={{justifyContent: 'flex-end'}}>
				<Grid item sm={2} xs={12} className='bdl-order-items__service-cell'>
					{order.tax_amount && formatCurrency(order.tax_amount)}
				</Grid>
			</Grid>
		</div>
	);
}