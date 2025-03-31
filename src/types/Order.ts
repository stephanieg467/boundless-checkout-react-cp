import { IDetailedOrder } from "boundless-api-client";
import { IItemImage } from "../lib/addImagesToItems";

export interface IOrderWithCustmAttr extends IDetailedOrder {
	custom_attrs: {
		[key: string]: any;
	};
	image: IItemImage
}
