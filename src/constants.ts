export const DELIVERY_ID = 2;
export const SHIPPING_DELIVERY_ID = 3;
export const SELF_PICKUP_ID = 1;

export const DELIVERY_COST = "4.00";
export const SHIPPING_COST = "6.00";

export const DELIVERY_INFO = {
	delivery_id: DELIVERY_ID,
	title: "Delivery",
	description: "Deliver order to your address (available within Penticton, BC)",
	alias: "delivery",
	shipping_id: DELIVERY_ID,
	shipping_config: null,
	free_shipping_from: null,
	calc_method: null,
	created_at: "",
	shipping: null,
	img: null,
};

export const SHIPPING_DELIVERY_INFO = {
	delivery_id: SHIPPING_DELIVERY_ID,
	title: "Shipping",
	description: "Ship order to your address via UPS (available within BC, Canada). Expected delivery time 1-3 business days.",
	alias: "shipping",
	shipping_id: SHIPPING_DELIVERY_ID,
	shipping_config: null,
	free_shipping_from: null,
	calc_method: null,
	created_at: "",
	shipping: null,
	img: null,
};

export const SELF_PICKUP_INFO = {
	delivery_id: SELF_PICKUP_ID,
	title: "Self Pickup",
	description: "In Store Pick Up",
	alias: "selfPickup",
	shipping_id: SELF_PICKUP_ID,
	shipping_config: null,
	free_shipping_from: null,
	calc_method: null,
	created_at: "",
	shipping: null,
	img: null,
};

export const PAY_IN_STORE_PAYMENT_METHOD = "4";

export const CREDIT_CARD_PAYMENT_METHOD = "5";
