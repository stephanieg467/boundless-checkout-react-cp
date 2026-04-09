import React from "react";
import {getProductImg} from "../../lib/images";
import currency from "currency.js";
import useFormatCurrency from "../../hooks/useFormatCurrency";
import {useTranslation} from "react-i18next";
import {covaProductPrice, productIsDropShip} from "../../lib/products";
import {useAppSelector} from "../../hooks/redux";
import {RootState} from "../../redux/store";

export default function CartItems() {
	const cartItems = useAppSelector(
		(state: RootState) => state.app.items
	);
	const {formatCurrency} = useFormatCurrency();
	const {t} = useTranslation();

	if (!cartItems?.length) {
		return (
			<div style={{padding: 15, textAlign: "center"}}>
				{t("cart.items.cartEmpty")}
			</div>
		);
	}

	return (
		<ul className="bdl-cart-item__list">
			{cartItems?.map((item) => {
				const product = item.product;
				const price = covaProductPrice(product);

				return (
					<li className="bdl-cart-item" key={product.ProductId}>
						{product.HeroShotUri ? (
							<div className="bdl-cart-item__img">
								<img
									{...getProductImg(
										{path: product.HeroShotUri, width: 60, height: 60},
										200
									)}
								/>
							</div>
						) : (
							<div className="bdl-cart-item__img no-image" />
						)}
						<div className="bdl-cart-item__desc">
							<h5 className="bdl-cart-item__title">
								{product.Name}
								{productIsDropShip(product) && (
									<>
										<div className="bdl-cart-item__drop-ship-note" style={{marginTop: "8px"}}>
											{"Note: This item is not available same day"}
										</div>
									</>
								)}
							</h5>
							<div className="bdl-cart-item__price">
								{price && formatCurrency(price)} x {item.qty} pcs
							</div>
							<div className="bdl-cart-item__total">
								{price &&
									formatCurrency(currency(price).multiply(item.qty).toString())}
							</div>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
