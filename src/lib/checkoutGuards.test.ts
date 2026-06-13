import {
	DELIVERY_ID,
	DELIVERY_INFO,
	SELF_PICKUP_ID,
	SELF_PICKUP_INFO,
	SHIPPING_DELIVERY_ID,
	SHIPPING_DELIVERY_INFO,
} from "../constants";
import {ICheckoutStepper, TCheckoutStep} from "../types/common";
import {ICovaCustomer, IOrderWithCustmAttr} from "../types/Order";
import {IAddress, IDelivery, IOrderService, TAddressType} from "boundless-api-client";
import {
	canNavigateToCheckoutStep,
	getCheckoutStepWarning,
	getFirstIncompleteCheckoutStep,
	isContactStepComplete,
	isShippingStepComplete,
} from "./checkoutGuards";

const requiredContactFields = ["id", "first_name", "last_name", "email", "phone", "dob"] as const;
const requiredAddressFields = ["first_name", "last_name", "address_line_1", "city", "state", "zip", "phone"] as const;
const invalidStringValues = [null, "", "   "] as const;

const completeCustomer = (overrides: Partial<ICovaCustomer> = {}): ICovaCustomer => ({
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

const completeAddress = (
	type: TAddressType,
	overrides: Partial<IAddress> = {},
): IAddress => ({
	id: `${type}-address-1`,
	type,
	is_default: type === TAddressType.shipping,
	first_name: "Jane",
	last_name: "Doe",
	company: null,
	address_line_1: "123 Main St",
	address_line_2: null,
	city: "Penticton",
	state: "BC",
	country_id: 40,
	zip: "V2A 1A1",
	phone: "2505551234",
	created_at: "2026-01-01T00:00:00.000Z",
	vwCountry: null,
	...overrides,
});

const selectedService = (
	service_id: number,
	title: string,
	delivery: IDelivery,
): IOrderService => ({
	order_service_id: service_id,
	service_id,
	qty: 1,
	total_price: "0.00",
	item_price_id: "",
	is_delivery: service_id !== SELF_PICKUP_ID,
	serviceDelivery: {
		delivery_id: service_id,
		title,
		text_info: null,
		data: null,
		delivery,
	},
});

const pickupService = () => selectedService(SELF_PICKUP_ID, "Self Pickup", SELF_PICKUP_INFO);
const deliveryService = () => selectedService(DELIVERY_ID, "Delivery", DELIVERY_INFO);
const shippingService = () => selectedService(SHIPPING_DELIVERY_ID, "Shipping", SHIPPING_DELIVERY_INFO);

const orderWith = (overrides: Partial<IOrderWithCustmAttr> = {}): IOrderWithCustmAttr => ({
	id: "order-1",
	status_id: null,
	payment_method_id: null,
	service_total_price: null,
	payment_mark_up: null,
	total_price: null,
	discount_for_order: null,
	tax_amount: null,
	publishing_status: "published" as IOrderWithCustmAttr["publishing_status"],
	created_at: "2026-01-01T00:00:00.000Z",
	customer: completeCustomer(),
	services: [pickupService()],
	tax_calculations: null,
	custom_attrs: {},
	paid_at: null,
	...overrides,
});

const stepperWith = (overrides: Partial<ICheckoutStepper> = {}): ICheckoutStepper => ({
	currentStep: TCheckoutStep.contactInfo,
	filledSteps: [],
	steps: [
		TCheckoutStep.contactInfo,
		TCheckoutStep.shippingAddress,
		TCheckoutStep.paymentMethod,
	],
	...overrides,
});

describe("checkout guards", () => {
	describe("isContactStepComplete", () => {
		it("returns false when the order has no customer", () => {
			expect(isContactStepComplete(orderWith({customer: undefined}))).toBe(false);
		});

		it.each(requiredContactFields)(
			"returns false when customer.%s is missing, null, empty, or whitespace",
			(field) => {
				const customerWithoutField = completeCustomer();
				delete (customerWithoutField as unknown as Record<string, unknown>)[field];

				expect(isContactStepComplete(orderWith({customer: customerWithoutField}))).toBe(false);

				for (const invalidValue of invalidStringValues) {
					expect(
						isContactStepComplete(
							orderWith({
								customer: completeCustomer({
									[field]: invalidValue,
								} as unknown as Partial<ICovaCustomer>),
							}),
						),
					).toBe(false);
				}
			},
		);

		it("returns true when every required contact field is non-empty", () => {
			expect(isContactStepComplete(orderWith({customer: completeCustomer()}))).toBe(true);
		});
	});

	describe("isShippingStepComplete", () => {
		it("returns false when no delivery or pickup service is selected", () => {
			expect(isShippingStepComplete(orderWith({services: undefined}))).toBe(false);
			expect(isShippingStepComplete(orderWith({services: []}))).toBe(false);
		});

		it("returns true for self pickup with a selected pickup service and no addresses", () => {
			expect(
				isShippingStepComplete(
					orderWith({
						services: [pickupService()],
						customer: completeCustomer({addresses: []}),
					}),
				),
			).toBe(true);
		});

		describe.each([
			["delivery", deliveryService],
			["shipping", shippingService],
		])("%s service", (_label, serviceFactory) => {
			it("returns false without a shipping address", () => {
				expect(
					isShippingStepComplete(
						orderWith({
							services: [serviceFactory()],
							customer: completeCustomer({addresses: []}),
						}),
					),
				).toBe(false);
			});

			it.each(requiredAddressFields)(
				"returns false when the shipping address has no %s",
				(field) => {
					const shippingAddressWithoutField = completeAddress(TAddressType.shipping);
					delete (shippingAddressWithoutField as unknown as Record<string, unknown>)[field];

					expect(
						isShippingStepComplete(
							orderWith({
								services: [serviceFactory()],
								customer: completeCustomer({addresses: [shippingAddressWithoutField]}),
							}),
						),
					).toBe(false);

					for (const invalidValue of invalidStringValues) {
						expect(
							isShippingStepComplete(
								orderWith({
									services: [serviceFactory()],
									customer: completeCustomer({
										addresses: [
											completeAddress(TAddressType.shipping, {[field]: invalidValue}),
										],
									}),
								}),
							),
						).toBe(false);
					}
				},
			);

			it("returns true with a complete shipping address", () => {
				expect(
					isShippingStepComplete(
						orderWith({
							services: [serviceFactory()],
							customer: completeCustomer({
								addresses: [completeAddress(TAddressType.shipping)],
							}),
						}),
					),
				).toBe(true);
			});
		});

		it("requires an existing billing address to have all required address fields", () => {
			expect(
				isShippingStepComplete(
					orderWith({
						services: [shippingService()],
						customer: completeCustomer({
							addresses: [
								completeAddress(TAddressType.shipping),
								completeAddress(TAddressType.billing, {phone: "   "}),
							],
						}),
					}),
				),
			).toBe(false);

			expect(
				isShippingStepComplete(
					orderWith({
						services: [shippingService()],
						customer: completeCustomer({
							addresses: [
								completeAddress(TAddressType.shipping),
								completeAddress(TAddressType.billing),
							],
						}),
					}),
				),
			).toBe(true);
		});
	});

	describe("checkout step navigation", () => {
		it("returns contactInfo as the first incomplete step before shippingAddress", () => {
			expect(
				getFirstIncompleteCheckoutStep(
					orderWith({customer: undefined, services: []}),
					stepperWith(),
				),
			).toBe(TCheckoutStep.contactInfo);
		});

		it("returns shippingAddress when contact is complete but shipping is incomplete", () => {
			expect(
				getFirstIncompleteCheckoutStep(
					orderWith({customer: completeCustomer(), services: []}),
					stepperWith(),
				),
			).toBe(TCheckoutStep.shippingAddress);
		});

		it("blocks navigation to payment when either contact or shipping is incomplete", () => {
			const stepper = stepperWith({currentStep: TCheckoutStep.shippingAddress});

			expect(
				canNavigateToCheckoutStep(
					TCheckoutStep.paymentMethod,
					orderWith({customer: undefined, services: [pickupService()]}),
					stepper,
				),
			).toBe(false);
			expect(
				canNavigateToCheckoutStep(
					TCheckoutStep.paymentMethod,
					orderWith({customer: completeCustomer(), services: []}),
					stepper,
				),
			).toBe(false);
		});

		it("blocks staying on payment when protected prerequisites are incomplete", () => {
			expect(
				canNavigateToCheckoutStep(
					TCheckoutStep.paymentMethod,
					orderWith({customer: undefined, services: []}),
					stepperWith({currentStep: TCheckoutStep.paymentMethod}),
				),
			).toBe(false);
		});

		it("requires deliveryDetails before payment when it appears before payment in the stepper", () => {
			const stepper = stepperWith({
				currentStep: TCheckoutStep.shippingAddress,
				steps: [
					TCheckoutStep.contactInfo,
					TCheckoutStep.shippingAddress,
					TCheckoutStep.deliveryDetails,
					TCheckoutStep.paymentMethod,
				],
			});

			expect(
				canNavigateToCheckoutStep(
					TCheckoutStep.paymentMethod,
					orderWith({customer: completeCustomer(), services: [pickupService()]}),
					stepper,
				),
			).toBe(false);
		});

		it("allows payment when contact, shipping, and deliveryDetails prerequisites are complete", () => {
			const stepper = stepperWith({
				currentStep: TCheckoutStep.shippingAddress,
				filledSteps: [TCheckoutStep.deliveryDetails],
				steps: [
					TCheckoutStep.contactInfo,
					TCheckoutStep.shippingAddress,
					TCheckoutStep.deliveryDetails,
					TCheckoutStep.paymentMethod,
				],
			});

			expect(
				canNavigateToCheckoutStep(
					TCheckoutStep.paymentMethod,
					orderWith({customer: completeCustomer(), services: [pickupService()]}),
					stepper,
				),
			).toBe(true);
		});

		it("allows navigation to shippingAddress when contact is complete", () => {
			expect(
				canNavigateToCheckoutStep(
					TCheckoutStep.shippingAddress,
					orderWith({customer: completeCustomer(), services: []}),
					stepperWith({currentStep: TCheckoutStep.contactInfo}),
				),
			).toBe(true);
		});

		it("allows backward navigation to an earlier step even when persisted data is incomplete", () => {
			expect(
				canNavigateToCheckoutStep(
					TCheckoutStep.shippingAddress,
					orderWith({customer: undefined, services: []}),
					stepperWith({currentStep: TCheckoutStep.paymentMethod}),
				),
			).toBe(true);
		});
	});

	describe("getCheckoutStepWarning", () => {
		it.each([
			[
				TCheckoutStep.contactInfo,
				"Please complete your contact information before continuing.",
			],
			[
				TCheckoutStep.shippingAddress,
				"Please complete your delivery method before continuing.",
			],
			[
				TCheckoutStep.deliveryDetails,
				"Please complete your delivery details before continuing.",
			],
		])("returns the user-facing warning for %s", (step, message) => {
			expect(getCheckoutStepWarning(step)).toEqual({step, message});
		});

		it("returns a generic fallback warning for steps without a specific message", () => {
			expect(getCheckoutStepWarning(TCheckoutStep.paymentMethod)).toEqual({
				step: TCheckoutStep.paymentMethod,
				message: "Please complete this checkout step before continuing.",
			});
		});
	});
});
