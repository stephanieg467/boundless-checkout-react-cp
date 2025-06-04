import React from "react";
import currency from "currency.js";
import { Grid } from "@mui/material";
import { getProductImg } from "../../lib/images";
import useFormatCurrency from "../../hooks/useFormatCurrency";
import { useTranslation } from "react-i18next";
import { CovaCartItem } from "../../types/cart";
import { covaProductPrice } from "../../lib/products";

export default function OrderRow({ item }: { item: CovaCartItem }) {
	const { formatCurrency } = useFormatCurrency();
	const { t } = useTranslation();
	const product = item.product;
	const price = covaProductPrice(product);

	return (
		<>
			<Grid className="bdl-order-item" container>
				<Grid item className="bdl-order-item__description-col" sm={6} xs={12}>
					{product.HeroShotUri ? (
						<div className="bdl-order-item__img">
							<img
								{...getProductImg(
									{ path: product.HeroShotUri, width: 60, height: 60 },
									200
								)}
							/>
						</div>
					) : (
						<div className="bdl-order-item__img no-image" />
					)}
					<div className="bdl-order-item__title">
						<div className="bdl-order-item__title-row">
							{product.Name || ""}
						</div>
						{/* {item.vwItem.type === 'variant' && <div className='bdl-order-item__title-row bdl-order-item__title-row_muted'>{item.vwItem?.variant?.title || ''}</div>} */}
						{/* {(item.vwItem.product?.sku || item.vwItem.variant?.sku) && (
							<div className="bdl-order-item__title-row bdl-order-item__title-row_muted">
								{t("orderInfo.row.sku")}{" "}
								{item.vwItem.variant?.sku || item.vwItem.product?.sku}
							</div>
						)} */}
					</div>
				</Grid>
				<Grid item className="bdl-order-item__col" sm={2} xs={12}>
					<span className="bdl-order-items__label">
						<strong>Price: </strong>
					</span>
					<span className="bdl-order-items__value">
						{price &&
							formatCurrency(price)}
					</span>
				</Grid>
				<Grid item className="bdl-order-item__col" sm={2} xs={12}>
					<span className="bdl-order-items__label">
						<strong>{t("orderInfo.row.qty")} </strong>
					</span>
					<span className="bdl-order-items__value">{item.qty}</span>
				</Grid>
				<Grid item className="bdl-order-item__col" sm={2} xs={12}>
					<span className="bdl-order-items__label">
						<strong>{t("orderInfo.row.total")} </strong>
					</span>
					<span className="bdl-order-items__value">
						{price &&
							formatCurrency(
								currency(price)
									.multiply(item.qty)
									.toString()
							)}
					</span>
				</Grid>
			</Grid>
		</>
	);
}
