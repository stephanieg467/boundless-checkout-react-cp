import { CovaCartItem } from "../types/cart";

export async function getOrderTaxes(cartItems: CovaCartItem[]): Promise<string> {
	const taxes = async () => {
		try {
			const resp = await fetch(`${process.env.BASE_URL}api/covaTaxes`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ cartItems: cartItems }),
			});
			return await resp.json();
		} catch (error) {
			console.error("Failed to get shipping", error);
			throw new Error("Failed to get shipping rates");
		}
	};
	return taxes();
}
