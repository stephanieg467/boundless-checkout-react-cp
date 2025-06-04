import { ICustomer, IOrderDiscount, IOrderService, IOrderStatus, IPaymentMethod, ITotal, TPublishingStatus } from "boundless-api-client";
import { CovaCartItem } from "./cart";


export interface IOrderWithCustmAttr {
	id: string;
	status_id: null | number;
	payment_method_id: null | number | string;
	service_total_price: null | string;
	payment_mark_up: null | string;
	total_price: null | string;
	discount_for_order: null | string;
	tax_amount: null | string;
	paid_at: null | string;
	publishing_status: TPublishingStatus;
	created_at: string;
	customer?: ICustomer;
	discounts?: IOrderDiscount[];
	paymentMethod?: IPaymentMethod;
	services?: IOrderService[];
	tax_calculations: ITotal | null;
	custom_attrs: {
		[key: string]: any;
	};
	items: CovaCartItem[];
	status: IOrderStatus | null;
	tip?: string;
	delivery_time?: string;
}

export interface ICheckoutData {
	order: IOrderWithCustmAttr | undefined;
	total: ITotal | undefined;
	items?: CovaCartItem[]
}
