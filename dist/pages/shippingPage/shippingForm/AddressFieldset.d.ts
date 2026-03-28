import { IVWCountry } from "boundless-api-client";
import { FormikProps } from "formik";
import { IFieldAttrs } from "../../../lib/formUtils";
import { IShippingFormValues } from "../../../types/shippingForm";
export default function AddressFieldset({ countries, showPhone, keyPrefix, }: IProps): import("react/jsx-runtime").JSX.Element;
interface IProps {
    countries: IVWCountry[];
    showPhone?: boolean;
    keyPrefix: "shipping_address" | "billing_address";
}
export interface IAddressFields {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    country_id?: number | string;
    zip?: string;
    phone?: string;
}
export declare function addressFieldAttrs(keyPrefix: "shipping_address" | "billing_address", field: string, formikProps: FormikProps<IShippingFormValues>, helperText?: string): IFieldAttrs;
export {};
