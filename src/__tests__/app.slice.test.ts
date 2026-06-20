import appReducer, {
	addFilledStep,
	setCheckoutData,
	setCurrentStep,
	setStepWarning,
} from "../redux/reducers/app";
import {TCheckoutStep} from "../types/common";

const makeAppState = (overrides: Record<string, unknown> = {}) => ({
	isInited: true,
	show: true,
	globalError: null,
	stepWarning: null,
	stepper: {
		currentStep: TCheckoutStep.contactInfo,
		steps: [
			TCheckoutStep.contactInfo,
			TCheckoutStep.shippingAddress,
			TCheckoutStep.deliveryDetails,
			TCheckoutStep.paymentMethod,
		],
		filledSteps: [],
	},
	...overrides,
} as any);

const makeCheckoutDataPayload = (overrides: Record<string, unknown> = {}) => ({
	items: [],
	order: {id: "order-1", custom_attrs: {}} as any,
	currency: {alias: "USD"} as any,
	localeSettings: {} as any,
	total: {total: "10.00", qty: 1} as any,
	stepper: {
		currentStep: TCheckoutStep.contactInfo,
		steps: [TCheckoutStep.contactInfo, TCheckoutStep.shippingAddress],
		filledSteps: [],
	},
	...overrides,
} as any);

describe("app slice – warning state", () => {
	it("initializes with no inline step warning", () => {
		const state = appReducer(undefined, {type: "@@INIT"} as any);

		expect((state as any).stepWarning).toBeNull();
	});

	it("stores and clears an inline step warning", () => {
		const warning = {
			step: TCheckoutStep.shippingAddress,
			message: "Please complete your delivery method before continuing.",
		};

		const warned = appReducer(undefined, setStepWarning(warning));
		expect((warned as any).stepWarning).toEqual(warning);
	});
});

describe("app slice – setCheckoutData", () => {
	it("stores a provided inline step warning", () => {
		const warning = {
			step: TCheckoutStep.shippingAddress,
			message: "Please complete your shipping address before continuing.",
		};

		const next = appReducer(
			undefined,
			setCheckoutData(makeCheckoutDataPayload({stepWarning: warning})),
		);

		expect((next as any).stepWarning).toEqual(warning);
	});

	it("defaults the inline step warning to null when omitted", () => {
		const next = appReducer(undefined, setCheckoutData(makeCheckoutDataPayload()));

		expect((next as any).stepWarning).toBeNull();
	});
});

describe("app slice – addFilledStep", () => {
	it("invalidates later filled steps according to the configured step order", () => {
		const state = makeAppState({
			stepper: {
				currentStep: TCheckoutStep.deliveryDetails,
				steps: [
					TCheckoutStep.contactInfo,
					TCheckoutStep.shippingAddress,
					TCheckoutStep.deliveryDetails,
					TCheckoutStep.paymentMethod,
				],
				filledSteps: [
					TCheckoutStep.contactInfo,
					TCheckoutStep.shippingAddress,
					TCheckoutStep.deliveryDetails,
				],
			},
		});

		const next = appReducer(state, addFilledStep({step: TCheckoutStep.contactInfo}));

		expect(next.stepper?.filledSteps).toEqual([TCheckoutStep.contactInfo]);
	});

	it("adds the completed step when it is not already filled", () => {
		const state = makeAppState({
			stepper: {
				currentStep: TCheckoutStep.shippingAddress,
				steps: [
					TCheckoutStep.contactInfo,
					TCheckoutStep.shippingAddress,
					TCheckoutStep.paymentMethod,
				],
				filledSteps: [TCheckoutStep.contactInfo],
			},
		});

		const next = appReducer(state, addFilledStep({step: TCheckoutStep.shippingAddress}));

		expect(next.stepper?.filledSteps).toEqual([
			TCheckoutStep.contactInfo,
			TCheckoutStep.shippingAddress,
		]);
	});

	it("ignores a completed step that is not present in the configured step order", () => {
		const state = makeAppState({
			stepper: {
				currentStep: TCheckoutStep.shippingAddress,
				steps: [TCheckoutStep.contactInfo, TCheckoutStep.shippingAddress],
				filledSteps: [TCheckoutStep.contactInfo, TCheckoutStep.shippingAddress],
			},
		});

		const next = appReducer(state, addFilledStep({step: TCheckoutStep.paymentMethod}));

		expect(next.stepper?.filledSteps).toEqual([
			TCheckoutStep.contactInfo,
			TCheckoutStep.shippingAddress,
		]);
		expect(next.stepper?.filledSteps).not.toContain(TCheckoutStep.paymentMethod);
	});

	it("clears the inline warning when the matching step is completed", () => {
		const state = makeAppState({
			stepWarning: {
				step: TCheckoutStep.contactInfo,
				message: "Please complete your contact information before continuing.",
			},
		});

		const next = appReducer(state, addFilledStep({step: TCheckoutStep.contactInfo}));

		expect((next as any).stepWarning).toBeNull();
	});
});

describe("app slice – setCurrentStep", () => {
	it("updates stepper.currentStep", () => {
		const initial = makeAppState({
			stepper: {
				currentStep: TCheckoutStep.contactInfo,
				steps: [TCheckoutStep.contactInfo, TCheckoutStep.paymentMethod],
				filledSteps: [],
			},
		});

		const next = appReducer(initial, setCurrentStep(TCheckoutStep.paymentMethod));
		expect(next.stepper?.currentStep).toBe(TCheckoutStep.paymentMethod);
	});

	it("is a no-op when stepper is null", () => {
		const initial = {isInited: false, show: false, globalError: null, stepWarning: null, stepper: null} as any;
		const next = appReducer(initial, setCurrentStep(TCheckoutStep.contactInfo));
		expect(next.stepper).toBeNull();
	});
});
