export interface IPaymentMethod {
	payment_method_id: string;
	title: string;
}

export interface IPaymentPageData {
	paymentMethods: IPaymentMethod[];
}
