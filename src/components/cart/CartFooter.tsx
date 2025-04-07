import {TDiscountType} from 'boundless-api-client';
import React, {useState} from 'react';
import clsx from 'clsx';
import {useAppDispatch, useAppSelector} from '../../hooks/redux';
import {addPromise} from '../../redux/actions/xhr';
import {setOrder, setTotal} from '../../redux/reducers/app';
import useFormatCurrency from '../../hooks/useFormatCurrency';
import {useTranslation} from 'react-i18next';
import { hasShipping, updateOrderTaxes } from '../../lib/shipping';
import { IOrderWithCustmAttr } from '../../types/Order';

export default async function CartFooter({open}: ICartFooterProps) {
	const dispatch = useAppDispatch();
	const api = useAppSelector(state => state.app.api);
	const order = useAppSelector(state => state.app.order) as IOrderWithCustmAttr;
	const total = useAppSelector(state => state.app.total);
	const taxSettings = useAppSelector(state => state.app.taxSettings);
	const [submitting, setSubmitting] = useState(false);
	const {formatCurrency} = useFormatCurrency();
	const {t} = useTranslation();

	const getDiscountAmount = () => {
		if (!order?.discounts || !order?.discounts.length) return '';
		const discount = order.discounts[0];
		if (discount.discount_type === TDiscountType.percent) return ` (${discount.value}%)`;

		return '';
	};

	const handleRmDiscount = (e: React.MouseEvent) => {
		e.preventDefault();
		if (
			!window.confirm(t('form.areYouSure') as string)
			|| !api
			|| !order?.id
			|| submitting
		) return;

		setSubmitting(true);

		const promise = api.checkout.clearDiscounts(order.id)
			.then(({order, total}) => {
				updateOrderTaxes(order as IOrderWithCustmAttr, total);
				dispatch(setOrder(order));
				dispatch(setTotal(total));
			})
			.catch((err) => console.error(err))
			.finally(() => setSubmitting(false));

		dispatch(addPromise(promise));
	};

	if (!order || !total) return null;

	const hasDiscount = total.discount != '0';
	const orderHasShipping = hasShipping(order);

	const calculateBeverageCount = async () => {
		let count = 0;
		
		if (order.items) {
			await Promise.all(order.items.map(async (item) => {
				const product = await api?.catalog.getProduct(item.vwItem.product_id);
				if (product?.props.arbitrary_data?.is_beverage) {
					count += item.qty;
				}
			}));
		}
		
		return count;
	};

	const numOfBeverages = await calculateBeverageCount()
	const beverageTaxes = numOfBeverages > 0 ? Number(numOfBeverages * 0.10) : 0;
	const shippingTaxes = orderHasShipping && order.custom_attrs?.shippingTax ? Number(order.custom_attrs?.shippingTax) : 0;
	const initialTaxes = total.tax.totalTaxAmount;

	const totalTaxAmount = Number(initialTaxes) + shippingTaxes + beverageTaxes;
	const hasTax = taxSettings?.turnedOn && totalTaxAmount > 0;

	const totalPrice = Number(total.servicesSubTotal.price) + Number(total.itemsSubTotal.price) - Number(total.discount) + totalTaxAmount;

	return (
		<div className={clsx('bdl-cart__footer', {open})}>
			{(orderHasShipping || hasDiscount || hasTax) && <div className='bdl-cart__footer-row'>
				<h5 className='bdl-cart__footer-title'>
					{t('cart.footer.subTotal')}
					<span className='bdl-cart__footer-value'> {formatCurrency(total.itemsSubTotal.price)}</span>
				</h5>
			</div>}
			{hasDiscount && <div className="bdl-cart__footer-row">
				<h5 className='bdl-cart__footer-title'>
					{t('cart.footer.couponTitle', {amount: getDiscountAmount()})}
					<span className='bdl-cart__footer-value'> -{formatCurrency(total.discount)}</span>
				</h5>
			</div>}
			{orderHasShipping && <div className="bdl-cart__footer-row" >
				<h5 className='bdl-cart__footer-title'>
					{t('cart.footer.shipping')}
					<span className='bdl-cart__footer-value'> {formatCurrency(total.servicesSubTotal.price)}</span>
				</h5>
			</div>}

			{hasTax && <div className="bdl-cart__footer-row" >
				<h5 className='bdl-cart__footer-title'>{taxSettings?.taxTitle}:
					<span className='bdl-cart__footer-value'>{formatCurrency(totalTaxAmount)}</span>
				</h5>
			</div>}
			<h4 className="bdl-cart__footer-row bdl-cart__footer-row_total">
				{t('cart.footer.total')} <span className='bdl-cart__footer-value'>{formatCurrency(totalPrice)}</span>
			</h4>

			{hasDiscount && <div className='bdl-cart__footer-rm'>
				<small>
					<a href="#" className='bdl-cart__footer-rm-link' onClick={handleRmDiscount}>
						{t('cart.footer.removeCoupon')}
					</a>
				</small>
			</div>}
		</div>
	);
}

interface ICartFooterProps {
	open: boolean;
}