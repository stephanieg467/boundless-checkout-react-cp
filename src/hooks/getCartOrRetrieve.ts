import { ICartTotal } from "boundless-api-client";
import { CovaCartItem } from "../types/cart";

export const getCartOrRetrieve = (): {
	id: string;
	total: ICartTotal;
	items?: CovaCartItem[];
	taxAmount: number;
} | null => {
	const cart = localStorage.getItem("cc_cart");
	if (cart) {
		return JSON.parse(cart);
	}

	return null;
};