import {IAddressFields} from "boundless-api-client";

export type IAddressFormFields = Omit<IAddressFields, "phone">;

export interface IShippingFormValues {
	delivery_id: number;
	delivery_time?: string;
	deliveryInstructions?: string;
	shipping_address?: IAddressFormFields;
	billing_address_the_same?: boolean;
	billing_address?: IAddressFormFields;
}

export interface IAddressSubForm {
	first_name?: string;
	last_name: string;
	company?: string;
	address_line_1: string;
	address_line_2?: string;
	city: string;
	state?: string;
	country_id: number|string;
	zip: string;
}
