import {AppThunk} from "../store";
import {
	setCheckoutData,
	setCheckoutInited,
	setGlobalError,
	TOnCheckoutInited,
} from "../reducers/app";
import {getCartOrRetrieve} from "../../hooks/getCartOrRetrieve";
import {ICartTotal, IOrderService, ITotal, TPublishingStatus} from "boundless-api-client";
import {ICheckoutStepper, TCheckoutStep} from "../../types/common";
import type {CovaCartItem, CovaCheckoutInitData} from "../../types/cart";
import type {IOrderWithCustmAttr} from "../../types/Order";
import {getCheckoutData} from "../../hooks/checkoutData";
import {getOrderTaxes} from "../../lib/taxes";
import {ordersDropShippingItems} from "../../lib/products";
import {
	canNavigateToCheckoutStep,
	getCheckoutStepWarning,
	getFirstIncompleteCheckoutStep,
} from "../../lib/checkoutGuards";

const DEFAULT_CURRENCY = {
	currency_id: 0,
	alias: "CAD",
	code: 4217,
};

const DEFAULT_LOCALE_SETTINGS = {
	money: {
		decimal: ".",
		thousand: ",",
		precision: 2,
		format: "%s%v",
		symbol: "$",
	},
};

const buildCheckoutSteps = (items: Parameters<typeof ordersDropShippingItems>[0]): TCheckoutStep[] => {
	const hasDropShipItems = ordersDropShippingItems(items).length > 0;

	return [
		TCheckoutStep.contactInfo,
		TCheckoutStep.shippingAddress,
		...(hasDropShipItems ? [TCheckoutStep.deliveryDetails] : []),
		TCheckoutStep.paymentMethod,
	];
};

type CheckoutDataOrder = IOrderWithCustmAttr | undefined;
type CheckoutDataOrderService = IOrderService | null;

type TaxSummary = {
	totalTaxAmount: string | null;
	itemsWithTax: CovaCartItem[];
	shipping: {
		shippingTaxes: unknown;
	};
};

const resolveOrderTaxes = async (
	items: CovaCartItem[],
	checkoutDataOrder: CheckoutDataOrder,
) => {
	if (checkoutDataOrder?.tax_amount) return checkoutDataOrder.tax_amount;

	return getOrderTaxes(items);
};

const buildTaxSummary = (
	items: CovaCartItem[],
	totalOrderTaxes: string | null,
	checkoutDataOrder: CheckoutDataOrder,
): TaxSummary => ({
	totalTaxAmount: totalOrderTaxes,
	itemsWithTax: items,
	shipping: {
		shippingTaxes: checkoutDataOrder?.tax_calculations?.tax?.shipping?.shippingTaxes,
	},
});

const buildCheckoutTotal = ({
	price,
	cartTotal,
	checkoutDataOrder,
	checkoutDataOrderService,
	tax,
}: {
	price: string | null;
	cartTotal: ICartTotal;
	checkoutDataOrder: CheckoutDataOrder;
	checkoutDataOrderService: CheckoutDataOrderService;
	tax: TaxSummary;
}): ITotal => ({
	price,
	itemsSubTotal: {
		price: checkoutDataOrder?.tax_calculations?.itemsSubTotal.price ?? cartTotal.total,
		qty: cartTotal.qty,
	},
	discount: checkoutDataOrder?.discount_for_order ?? "0",
	tax,
	servicesSubTotal: {
		price: checkoutDataOrderService ? checkoutDataOrderService.total_price : 0,
		qty: checkoutDataOrderService ? checkoutDataOrderService.qty : 0,
	},
} as unknown as ITotal);

const buildInitialOrder = ({
	cartId,
	stateOrder,
	cartTotal,
	checkoutDataOrder,
	checkoutDataOrderService,
	totalOrderTaxes,
	tax,
}: {
	cartId?: string;
	stateOrder: IOrderWithCustmAttr | undefined;
	cartTotal: ICartTotal;
	checkoutDataOrder: CheckoutDataOrder;
	checkoutDataOrderService: CheckoutDataOrderService;
	totalOrderTaxes: string | null;
	tax: TaxSummary;
}): IOrderWithCustmAttr => {
	const orderTotal = checkoutDataOrder?.total_price
		? checkoutDataOrder?.total_price
		: (Number(cartTotal.total) + Number(totalOrderTaxes)).toFixed(2);

	return {
		id: cartId ?? "",
		status_id: null,
		payment_method_id: checkoutDataOrder?.payment_method_id ?? null,
		paid_at: checkoutDataOrder?.paid_at ?? null,
		service_total_price: checkoutDataOrder?.service_total_price ?? "0.00",
		payment_mark_up: null,
		total_price: orderTotal,
		tip: checkoutDataOrder?.tip ?? "0.00",
		...(checkoutDataOrder?.delivery_time && {
			delivery_time: checkoutDataOrder.delivery_time,
		}),
		...(checkoutDataOrder?.drop_ship_delivery_time && {
			drop_ship_delivery_time: checkoutDataOrder.drop_ship_delivery_time,
		}),
		discount_for_order: checkoutDataOrder?.discount_for_order
			? checkoutDataOrder?.discount_for_order
			: null,
		discounts: checkoutDataOrder?.discounts ? checkoutDataOrder?.discounts : [],
		tax_amount: totalOrderTaxes,
		publishing_status: TPublishingStatus.published,
		created_at: stateOrder?.created_at ?? new Date().toISOString(),
		customer: checkoutDataOrder?.customer ?? undefined,
		services: checkoutDataOrder?.services ?? [],
		tax_calculations: checkoutDataOrder?.tax_calculations
			? checkoutDataOrder.tax_calculations
			: buildCheckoutTotal({
					price: totalOrderTaxes,
					cartTotal,
					checkoutDataOrder,
					checkoutDataOrderService,
					tax,
				}),
		custom_attrs: {
			...checkoutDataOrder?.custom_attrs,
			shippingTax: checkoutDataOrder?.custom_attrs?.shippingTax ?? "0.00",
			serviceRate: checkoutDataOrder?.custom_attrs?.serviceRate ?? "0.00",
			checkoutInited: true,
		},
	};
};

const normalizeStepper = (
	initialOrder: IOrderWithCustmAttr,
	stateStepper: ICheckoutStepper | null | undefined,
	steps: TCheckoutStep[],
) => {
	const requestedStepper = {
		filledSteps: stateStepper?.filledSteps ?? [],
		currentStep: stateStepper?.currentStep ?? TCheckoutStep.contactInfo,
		steps,
	};
	const firstIncompleteStep = getFirstIncompleteCheckoutStep(
		initialOrder,
		requestedStepper,
	);
	const requestedStepIsAllowed = canNavigateToCheckoutStep(
		requestedStepper.currentStep,
		initialOrder,
		requestedStepper,
	);
	const requestedStepExists = requestedStepper.steps.includes(
		requestedStepper.currentStep,
	);
	const fallbackStep = requestedStepper.steps.includes(TCheckoutStep.paymentMethod)
		? TCheckoutStep.paymentMethod
		: requestedStepper.steps[0] ?? TCheckoutStep.contactInfo;
	let normalizedCurrentStep = requestedStepExists
		? requestedStepper.currentStep
		: fallbackStep;
	let stepWarning = null;

	if (firstIncompleteStep && !requestedStepIsAllowed) {
		normalizedCurrentStep = firstIncompleteStep;
		stepWarning = getCheckoutStepWarning(normalizedCurrentStep);
	}

	return {
		stepper: {
			...requestedStepper,
			currentStep: normalizedCurrentStep,
		},
		stepWarning,
	};
};

const buildCheckoutInitData = ({
	items,
	initialOrder,
	normalizedStepper,
	stepWarning,
	checkoutDataTotal,
	checkoutDataOrder,
	cartTotal,
	checkoutDataOrderService,
	tax,
}: {
	items: CovaCartItem[];
	initialOrder: IOrderWithCustmAttr;
	normalizedStepper: ICheckoutStepper;
	stepWarning: ReturnType<typeof getCheckoutStepWarning> | null;
	checkoutDataTotal: ITotal | undefined;
	checkoutDataOrder: CheckoutDataOrder;
	cartTotal: ICartTotal;
	checkoutDataOrderService: CheckoutDataOrderService;
	tax: TaxSummary;
}): CovaCheckoutInitData & {stepWarning: ReturnType<typeof getCheckoutStepWarning> | null} => ({
	items,
	order: {...initialOrder},
	currency: {...DEFAULT_CURRENCY},
	localeSettings: {money: {...DEFAULT_LOCALE_SETTINGS.money}},
	stepper: normalizedStepper,
	stepWarning,
	total: checkoutDataTotal
		? checkoutDataTotal
		: buildCheckoutTotal({
				price: checkoutDataOrder?.total_price
					? checkoutDataOrder?.total_price
					: initialOrder.total_price,
				cartTotal,
				checkoutDataOrder,
				checkoutDataOrderService,
				tax,
			}),
});

export const initCheckoutByCart =
	(config: { onCheckoutInited?: TOnCheckoutInited }): AppThunk =>
	async (dispatch, getState) => {
		const {cartId, order, stepper} = getState().app;
		const {onCheckoutInited} = config;

		const cart = getCartOrRetrieve();

		try {
			if (!cart || !cart.items?.length) {
				dispatch(
					setGlobalError(
						"Your cart is empty. Please go back to the site and start shopping.",
					),
				);
				return;
			}

			const {items, total: cartTotal} = cart;
			const steps = buildCheckoutSteps(items);
			const checkoutData = getCheckoutData();
			const checkoutDataOrder = checkoutData?.order;

			const totalOrderTaxes = await resolveOrderTaxes(items, checkoutDataOrder);
			const tax = buildTaxSummary(items, totalOrderTaxes, checkoutDataOrder);

			const checkoutDataOrderService = checkoutDataOrder?.services?.[0] ?? null;
			const initialOrder = buildInitialOrder({
				cartId,
				stateOrder: order,
				cartTotal,
				checkoutDataOrder,
				checkoutDataOrderService,
				totalOrderTaxes,
				tax,
			});
			const {stepper: normalizedStepper, stepWarning} = normalizeStepper(
				initialOrder,
				stepper,
				steps,
			);

			const data = buildCheckoutInitData({
				items,
				initialOrder,
				normalizedStepper,
				stepWarning,
				checkoutDataTotal: checkoutData?.total,
				checkoutDataOrder,
				cartTotal,
				checkoutDataOrderService,
				tax,
			});
			dispatch(setCheckoutData(data));

			dispatch(setCheckoutInited({isInited: true}));

			if (onCheckoutInited) {
				onCheckoutInited(data);
			}
		} catch (error) {
			console.error(error);
			dispatch(
				setGlobalError(
					"Cannot initialize checkout. Please go back to the cart and try again.",
				),
			);
		}
	};
