import {IAddressFields} from 'boundless-api-client';
export interface IShippingFormValues {
	delivery_id: number;
	shipping_address?: IAddressFields;
	billing_address_the_same?: boolean;
	billing_address?: IAddressFields;
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
	phone?: string;
}

export interface IShippingRate {
  "price-quotes": {
    "price-quote": {
      "service-code": string;
      "service-link": string;
      "service-name": string;
      "price-details": {
        base: number;
        taxes: {
          gst: number;
          pst: number;
          hst: number;
        };
        due: number;
        options: {
          option: {
            "option-code": string;
            "option-name": string;
            "option-price": number;
            qualifier: {
              included: boolean;
            };
          };
        };
        adjustments: {
          adjustment: Array<{
            "adjustment-code": string;
            "adjustment-name": string;
            "adjustment-cost": number;
            qualifier?: {
              percent: number;
            };
          }>;
        };
      };
      "weight-details": string;
      "service-standard": {
        "am-delivery": boolean;
        "guaranteed-delivery": boolean;
        "expected-transit-time": number;
        "expected-delivery-date": string;
      };
    };
  }
}
