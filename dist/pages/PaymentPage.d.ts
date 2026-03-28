export default function PaymentPage(): import("react/jsx-runtime").JSX.Element;
export interface IPaymentMethod {
    payment_method_id: number | string;
    title: string;
}
export interface IPaymentPageData {
    paymentMethods: IPaymentMethod[];
}
