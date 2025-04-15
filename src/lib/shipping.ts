import {
	IDelivery,
	TShippingAlias,
	IDetailedOrder,
	BoundlessClient,
	ICartItem,
	ITotal,
	IOrder,
} from "boundless-api-client";
import { IShippingRate, IShippingRateInfo } from "../types/shippingForm";
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

export const deliveryMethod = (
	deliveryId: number,
	deliveryOptions: IDelivery[]
): string => {
	const selectedDelivery = deliveryOptions.find(
		({ delivery_id }) => delivery_id == deliveryId
	);

	if (selectedDelivery) {
		if (selectedDelivery.title === 'Canada Post') {
			return 'shipping'
		}
		if (selectedDelivery.title === 'Delivery') {
			return 'delivery'
		}
		return 'pickup'
	}

	return '';
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

export async function fetchShippingRates(
	zip: string,
	cartItems: ICartItem[] | undefined,
): Promise<IShippingRateInfo[] | null> {
	const shipping = async () => {
		try {
			const resp = await fetch(`${process.env.BASE_URL}api/shippingRates`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ zip: zip, cartItems: cartItems }),
			});
			
			if (!resp.ok) {
				throw new Error("Failed to get shipping rates");
			}
			
			return await resp.json();
		} catch (error) {
			console.error("Failed to get shipping", error);
			// @todo: test this.
			throw new Error("Failed to get shipping rate");
		}
	};
	return shipping();
}

export async function setOrderShippingRate(
	order: IDetailedOrder,
	cartItems: ICartItem[] | undefined,
	shippingRate?: string
): Promise<IShippingRate | null> {
	if (hasShipping(order) && shippingRate) {
		const serviceCodes = {
			'Xpresspost': 'DOM.XP',
			'Regular Parcel': 'DOM.RP',
			'Expedited Parcel': 'DOM.EP',
		} as const;
		const serviceCode = serviceCodes[shippingRate as keyof typeof serviceCodes];
		
		const shipping = async () => {
			try {
				const resp = await fetch(`${process.env.BASE_URL}api/shipping`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ serviceCode: serviceCode, order: order, cartItems: cartItems }),
				});
				return await resp.json();
			} catch (error) {
				console.error("Failed to get shipping", error);
				throw new Error("Failed to get shipping rates")
			}
		};
		return shipping();
	}
	return null;
}
