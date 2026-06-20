import {DELIVERY_ID, SELF_PICKUP_ID} from "../constants";
import {TCheckoutStep} from "../types/common";

export const completeCustomer = (overrides: Record<string, unknown> = {}) => ({
	id: "customer-1",
	email: "jane@example.com",
	created_at: "2026-01-01T00:00:00.000Z",
	first_name: "Jane",
	last_name: "Doe",
	phone: "2505551234",
	custom_attrs: {},
	addresses: [],
	dob: "1990-01-01",
	...overrides,
});

export const completeShippingAddress = (overrides: Record<string, unknown> = {}) => ({
	type: "shipping",
	first_name: "Jane",
	last_name: "Doe",
	address_line_1: "123 Main St",
	city: "Penticton",
	state: "BC",
	zip: "V2A 1A1",
	phone: "2505551234",
	...overrides,
});

export const orderWith = (overrides: Record<string, unknown> = {}) => ({
	id: "order-1",
	status_id: null,
	payment_method_id: null,
	service_total_price: null,
	payment_mark_up: null,
	total_price: null,
	discount_for_order: null,
	tax_amount: null,
	publishing_status: "published",
	created_at: "2026-01-01T00:00:00.000Z",
	customer: completeCustomer(),
	services: [],
	tax_calculations: null,
	custom_attrs: {},
	paid_at: null,
	...overrides,
});

export const stepperWith = ({
	currentStep = TCheckoutStep.paymentMethod,
	steps = [
		TCheckoutStep.contactInfo,
		TCheckoutStep.shippingAddress,
		TCheckoutStep.paymentMethod,
	],
	filledSteps = [],
}: {
	currentStep?: TCheckoutStep;
	steps?: TCheckoutStep[];
	filledSteps?: TCheckoutStep[];
} = {}) => ({
	currentStep,
	steps,
	filledSteps,
});

export const pickupService = (overrides: Record<string, unknown> = {}) => ({
	service_id: SELF_PICKUP_ID,
	serviceDelivery: {
		title: "Self Pickup",
		delivery: {
			alias: "selfPickup",
			title: "Self Pickup",
		},
	},
	...overrides,
});

export const deliveryService = (overrides: Record<string, unknown> = {}) => ({
	service_id: DELIVERY_ID,
	serviceDelivery: {
		title: "Delivery",
		delivery: {
			alias: "delivery",
			title: "Delivery",
		},
	},
	...overrides,
});
