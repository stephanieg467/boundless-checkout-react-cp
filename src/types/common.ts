export enum TCheckoutStep {
	contactInfo = "contact-info",
	shippingAddress = "shipping-address",
	deliveryDetails = "delivery-details",
	paymentMethod = "payment-method",
	thankYou = "thank-you",
}

export interface ICheckoutStepper {
	filledSteps: TCheckoutStep[];
	currentStep: TCheckoutStep;
	steps: TCheckoutStep[];
}
