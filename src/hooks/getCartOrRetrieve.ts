import {Cart} from "../types/cart";

export const getCartOrRetrieve = (): Cart | null => {
	const cart = localStorage.getItem("cc_cart");
	if (cart) {
		return JSON.parse(cart);
	}

	return null;
};

export const setCart = (cart: Cart) => {
	localStorage.setItem("cc_cart", JSON.stringify(cart));
};