import { IDetailedOrder } from "boundless-api-client";

export interface IOrderWithCustmAttr extends IDetailedOrder {
	custom_attrs: {
		[key: string]: any;
	};
}
