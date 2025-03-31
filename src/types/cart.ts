import { ICartItem } from "boundless-api-client";
import { IItemImage } from "../lib/addImagesToItems";

export interface IUseCartItems extends ICartItem {
	// thcGrams?: number;
	// originalQty?: number;
	// total_price?: number;
	image: IItemImage;
}