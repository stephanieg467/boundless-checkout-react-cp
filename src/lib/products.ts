import { useAppSelector } from "../hooks/redux"
import { CovaProduct } from "../types/cart"

export const covaProductPrice = (product: CovaProduct): string => {
  const price = product.Prices[0]?.Price
  const discountedPrice = product.discountedPrice
  return discountedPrice ? discountedPrice : price.toString()
}

export const cartHasTickets = () => {
  const cartItems = useAppSelector((state) => state.app.items);
  
  return cartItems?.some(
		(item) => item.product.ClassificationName === "Workshops"
	);
}