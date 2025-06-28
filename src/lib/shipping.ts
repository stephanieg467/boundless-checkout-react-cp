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
import { CovaCartItem } from "../types/cart";

export const isPickUpDelivery = (
	deliveryId: number,
	deliveryOptions: IDelivery[]
): boolean => {
	const selectedDelivery = deliveryOptions.find(
		({ delivery_id }) => delivery_id == deliveryId
	);

	if (selectedDelivery) {
		return selectedDelivery.alias === TShippingAlias.selfPickup;
	}

	return false;
};

export const isDeliveryMethod = (
	deliveryId: number,
	deliveryOptions: IDelivery[]
): boolean => {
	const selectedDelivery = deliveryOptions.find(
		({ delivery_id }) => delivery_id == deliveryId
	);

	if (selectedDelivery) {
		return selectedDelivery.title === "Delivery";
	}

	return false;
};

export const hasShipping = (order: IOrderWithCustmAttr | IOrder) => {
	if (!order.services || order.services.length < 1) return false;

	const serviceTitle = order.services[0].serviceDelivery?.delivery?.title;

	return serviceTitle === "Shipping" || serviceTitle === "Delivery";
};

export async function fetchShippingRates(
	zip: string,
	cartItems: CovaCartItem[] | undefined
): Promise<IShippingRateInfo[] | null> {
	const shipping = async () => {
		try {
			const resp = await fetch(`/api/shippingRates`, {
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
			throw new Error("Failed to get shipping rate");
		}
	};
	return shipping();
}

export async function getOrderShippingRate(
	order: IOrderWithCustmAttr,
	cartItems: CovaCartItem[] | undefined,
	shippingRate?: string
): Promise<IShippingRate | null> {
	if (shippingRate) {
		const serviceCodes = {
			Xpresspost: "DOM.XP",
			"Regular Parcel": "DOM.RP",
			"Expedited Parcel": "DOM.EP",
		} as const;
		const serviceCode = serviceCodes[shippingRate as keyof typeof serviceCodes];

		const shipping = async () => {
			try {
				const resp = await fetch(`/api/shipping`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						serviceCode: serviceCode,
						order: order,
						cartItems: cartItems,
					}),
				});
				return await resp.json();
			} catch (error) {
				console.error("Failed to get shipping", error);
				throw new Error("Failed to get shipping rates");
			}
		};
		return shipping();
	}
	return null;
}
