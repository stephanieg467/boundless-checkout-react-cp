import React, {useMemo} from 'react';
import Grid from '@mui/material/Grid';
import {IAddress, IOrderService, TAddressType} from 'boundless-api-client';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import useFormatCurrency from '../../hooks/useFormatCurrency';
import {useTranslation} from 'react-i18next';
import { ICovaCustomer } from '../../types/Order';

export default function OrderShipping({services, customer, hasShipping}: {services: IOrderService[], customer: ICovaCustomer | null, hasShipping: boolean}) {
	const delivery = useMemo(() => services.find(service => service.is_delivery), [services]);
	const shippingAddress = useMemo(() =>
		customer?.addresses?.find(address => address.type === TAddressType.shipping) || null
		, [customer]);

	const {formatCurrency} = useFormatCurrency();
	const {t} = useTranslation();

	if (!delivery) return null;

	return (
        <div className='bdl-order-items__service-row'>
            <h5 className='bdl-order-items__service-heading'>
				<LocalShippingIcon className='bdl-order-items__service-ico' fontSize='small' />
				{t('orderInfo.shipping.title')}
			</h5>
            <Grid container>
				<Grid
                    className='bdl-order-items__service-cell bdl-order-items__service-cell_title'
                    size={{
                        sm: 8,
                        xs: 12
                    }}>
					<div>{delivery.serviceDelivery?.delivery?.title || ''}</div>
					{hasShipping && shippingAddress && <ShippingAddress address={shippingAddress} />}
				</Grid>
				<Grid
                    className='bdl-order-items__service-cell'
                    size={{
                        sm: 2,
                        xs: 12
                    }}>
				</Grid>
				<Grid
                    className='bdl-order-items__service-cell'
                    size={{
                        sm: 2,
                        xs: 12
                    }}>
					<span className='bdl-order-items__label'>{t('orderInfo.shipping.total')} </span>
					<span className='bdl-order-items__value'>
						{delivery.total_price && formatCurrency(delivery.total_price)}
					</span>
				</Grid>
			</Grid>
        </div>
    );
}

const ShippingAddress = ({address}: {address: IAddress}) => {
	const fullName = [address.first_name || '', address.last_name || ''].join(' ').trim();
	const cityCountry = [
		address.city,
		address.state,
		address.vwCountry?.title,
		address.zip,
	].filter(el => el).join(', ');

	return (
		<>
			<p className='bdl-order-items__address-heading'>Ship to:</p>
			<address className='bdl-order-items__address'>
				{fullName && <p className='bdl-order-items__address-lane'>{fullName}</p>}
				{address.address_line_1 && <p className='bdl-order-items__address-lane'>{address.address_line_1}</p>}
				{address.address_line_2 && <p className='bdl-order-items__address-lane'>{address.address_line_2}</p>}
				{cityCountry && <p className='bdl-order-items__address-lane'>{cityCountry}</p>}
				{address.company && <p className='bdl-order-items__address-lane'>{address.company}</p>}
				{address.phone && <p className='bdl-order-items__address-lane'><abbr title="Phone">Phone: </abbr>{address.phone}</p>}
			</address>
		</>
	);
};