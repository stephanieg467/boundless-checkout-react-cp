import {ICheckoutData} from "../types/Order";
import {getCartOrRetrieve} from "./getCartOrRetrieve";

export const getCheckoutData = (): ICheckoutData | null => {
	const cc_checkout_data = localStorage.getItem("cc_checkout_data");
	if (cc_checkout_data) {
		return JSON.parse(cc_checkout_data);
	}

	return null;
};

export const setLocalStorageCheckoutData = (data: ICheckoutData): void => {
	try {
		const {items: currentCartItems,} = getCartOrRetrieve() || {items: []};

		const itemsWithThc = currentCartItems ? currentCartItems.map((el) => {
			const equivalentTo = el.product.ProductSpecifications.find((spec) => spec.DisplayName === "Equivalent To");
			const thcGrams = equivalentTo ? parseFloat(equivalentTo.Value) : 0;
			return {
				...el,
				thcGrams
			};
		}) : [];

		localStorage.setItem("cc_checkout_data", JSON.stringify({...data, items: itemsWithThc}));
	} catch (e) {
		if (
			(typeof e === "object" &&
				e !== null &&
				"name" in e &&
				(e as { name: string }).name === "QuotaExceededError") ||
			(e as { name: string }).name === "NS_ERROR_DOM_QUOTA_REACHED"
		) {
			// Firefox specific
			console.error("Error: LocalStorage quota exceeded!");
			// Handle the error, e.g., by notifying the user or clearing old data
		} else {
			console.error("setLocalStorageCheckoutData error occurred:", e);
		}
	}
};

export const clearCheckoutData = (): void => {
	if (typeof window !== "undefined" && window.localStorage) {
		localStorage.removeItem("cc_checkout_data");
	}
};
