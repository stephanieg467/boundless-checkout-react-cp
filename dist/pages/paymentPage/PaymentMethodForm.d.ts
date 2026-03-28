import { IPaymentPageData } from "../PaymentPage";
export default function PaymentMethodForm({ paymentPage, }: {
    paymentPage: IPaymentPageData;
}): import("react/jsx-runtime").JSX.Element;
export interface IPaymentMethodFormValues {
    payment_method_id: number | string;
    tip?: string;
    delivery_time?: string;
}
