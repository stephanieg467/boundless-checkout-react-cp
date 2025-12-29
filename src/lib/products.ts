import {useAppSelector} from "../hooks/redux";
import {Cart, CleanedCovaProduct, CovaCartItem} from "../types/cart";

export const covaProductPrice = (product: CleanedCovaProduct): string => {
  const price = product.Prices[0]?.Price;
  const discountedPrice = product.discountedPrice;
  return discountedPrice ? discountedPrice : price.toString();
};

export const isPromotionItem = (product: CleanedCovaProduct): boolean => {
  return !!product.discountedPrice;
};

export const cartPromotionItems = (cart: Cart): CovaCartItem[] => {
  return cart.items?.filter((item) => isPromotionItem(item.product)) ?? [];
};

export const cartHasTickets = () => {
  const cartItems = useAppSelector((state) => state.app.items);
  
  return cartItems?.some(
		(item) => item.product.ClassificationName === "Workshops"
	);
};