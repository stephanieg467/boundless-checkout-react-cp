import { CovaCartItem } from "../types/cart";

export async function getOrderTaxes(cartItems: CovaCartItem[]): Promise<string> {
	const taxes = async () => {
		try {
			const resp = await fetch(`/api/covaTaxes`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ cartItems: cartItems }),
			});
			return await resp.json();
		} catch (error) {
			console.error("Failed to get taxes", error);
			throw new Error("Failed to get taxes");
		}
	};
	return taxes();
}