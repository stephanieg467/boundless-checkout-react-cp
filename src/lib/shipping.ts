import {
	IDelivery,
	TShippingAlias,
	IDetailedOrder,
	BoundlessClient,
	ICartItem,
	ITotal,
	IOrder,
} from "boundless-api-client";
import { IShippingRate } from "../types/shippingForm";
import { IOrderWithCustmAttr } from "../types/Order";

export const isPickUpDelivery = (
	deliveryId: number,
	deliveryOptions: IDelivery[]
): boolean => {
	const selectedDelivery = deliveryOptions.find(
		({ delivery_id }) => delivery_id == deliveryId
	);

	if (selectedDelivery) {
		return selectedDelivery.shipping?.alias === TShippingAlias.selfPickup;
	}

	return false;
};

export const hasShipping = (order: IDetailedOrder | IOrder) => {
	if (!order.services || order.services.length < 1) return false;
	
	return order.services[0].serviceDelivery?.delivery?.title === "Canada Post";
};

export const itemsWeight = async (
	api: BoundlessClient,
	cartItems: ICartItem[] | undefined
): Promise<number | undefined> => {
	const weight = await cartItems?.reduce(async (accPromise, item) => {
		const acc = await accPromise;
		const product = await api.catalog.getProduct(item.vwItem.product_id);
		const weight = product.props.size?.weight ?? 0;
		const product_weight = (weight as number) * item.qty;
		return acc + product_weight;
	}, Promise.resolve(0));

	return weight;
};

export const updateOrderTaxes = (order: IOrderWithCustmAttr, total: ITotal) => {
	const shippingTax = order.custom_attrs?.shippingTax
		? order.custom_attrs?.shippingTax
		: 0;
	if (shippingTax) {
		order.total_price! += shippingTax;
		order.tax_amount += shippingTax;

		if (order.tax_calculations?.tax?.shipping) {
			order.tax_calculations.tax.shipping.shippingTaxes = shippingTax;
		}

		if (order.tax_calculations) {
			order.tax_calculations.tax.totalTaxAmount =
				total.tax.shipping?.shippingTaxes ?? null;
		}
	}
};

export async function getShippingRate(
	api: BoundlessClient,
	order: IDetailedOrder,
	cartItems: ICartItem[] | undefined
): Promise<IShippingRate | null> {
	if (api && hasShipping(order)) {
		const shipping = async () => {
			try {
				const resp = await fetch(`${process.env.BASE_URL}api/shipping`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ order: order, cartItems: cartItems }),
				});
				return await resp.json();
			} catch (error) {
				console.error("Failed to get shipping", error);
				return null;
			}
		};
		return shipping();
	}
	return null;
}
