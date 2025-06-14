import { CovaCartItem } from "../types/cart";
import to from 'await-to-js';

export async function getOrderTaxes(cartItems: CovaCartItem[]): Promise<string> {
	const fetchTaxes = async () => {
		const [err, resp] = await to(fetch(`/api/covaTaxes`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ cartItems: cartItems }),
		}));

		if (err || !resp) {
			console.error("Failed to get taxes", err);
			throw new Error("Failed to get taxes");
		}

		const [parseErr, data] = await to(resp.json());

		if (parseErr) {
			console.error("Failed to parse taxes response", parseErr);
			throw new Error("Failed to parse taxes response");
		}

		return data;
	};

	return fetchTaxes();
}