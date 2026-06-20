import {AppThunk} from "../store";
import {
	setCheckoutData,
	setCheckoutInited,
	setGlobalError,
	TOnCheckoutInited,
} from "../reducers/app";
import {getCartOrRetrieve} from "../../hooks/getCartOrRetrieve";
import {ITotal, TPublishingStatus} from "boundless-api-client";
import {TCheckoutStep} from "../../types/common";
import {getCheckoutData} from "../../hooks/checkoutData";
import {getOrderTaxes} from "../../lib/taxes";
import {ordersDropShippingItems} from "../../lib/products";
import {
	canNavigateToCheckoutStep,
	getCheckoutStepWarning,
	getFirstIncompleteCheckoutStep,
} from "../../lib/checkoutGuards";

export const initCheckoutByCart =
	(config: { onCheckoutInited?: TOnCheckoutInited }): AppThunk =>
	async (dispatch, getState) => {
		const {cartId, order, stepper} = getState().app;
		const {onCheckoutInited} = config;
		console.log("Initializing checkout with cart ID:", cartId);

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
			const hasDropShipItems = ordersDropShippingItems(items).length > 0;
			const steps: TCheckoutStep[] = [
				TCheckoutStep.contactInfo,
				TCheckoutStep.shippingAddress,
				...(hasDropShipItems ? [TCheckoutStep.deliveryDetails] : []),
				TCheckoutStep.paymentMethod,
			];
			const checkoutData = getCheckoutData();
			const checkoutDataOrder = checkoutData?.order;

			let totalOrderTaxes = checkoutDataOrder?.tax_amount;
			if (!totalOrderTaxes) {
				totalOrderTaxes = await getOrderTaxes(items);
			}

			const tax = {
				totalTaxAmount: totalOrderTaxes,
				itemsWithTax: items,
				shipping: {
					shippingTaxes:
						checkoutDataOrder?.tax_calculations?.tax?.shipping?.shippingTaxes,
				},
			};

			const orderTotal = checkoutDataOrder?.total_price
				? checkoutDataOrder?.total_price
				: (Number(cartTotal.total) + Number(totalOrderTaxes)).toFixed(2);

			const checkoutDataOrderService = checkoutDataOrder?.services?.[0] ?? null;

			const initialOrder = {
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
				discounts: checkoutDataOrder?.discounts
					? checkoutDataOrder?.discounts
					: [],
				tax_amount: totalOrderTaxes,
				publishing_status: TPublishingStatus.published,
				created_at: order?.created_at ?? new Date().toISOString(),
				customer: checkoutDataOrder?.customer ?? undefined,
				services: checkoutDataOrder?.services ?? [],
				tax_calculations: checkoutDataOrder?.tax_calculations
					? checkoutDataOrder.tax_calculations
					: ({
							price: totalOrderTaxes,
							itemsSubTotal: {
								price:
									checkoutDataOrder?.tax_calculations?.itemsSubTotal.price ??
									cartTotal.total,
								qty: cartTotal.qty,
							},
							discount: checkoutDataOrder?.discount_for_order ?? "0",
							tax: tax,
							servicesSubTotal: {
								price: checkoutDataOrderService
									? checkoutDataOrderService.total_price
									: 0,
								qty: checkoutDataOrderService
									? checkoutDataOrderService.qty
									: 0,
							},
						} as unknown as ITotal),
				custom_attrs: {
					...checkoutDataOrder?.custom_attrs,
					shippingTax: checkoutDataOrder?.custom_attrs?.shippingTax ?? "0.00",
					serviceRate: checkoutDataOrder?.custom_attrs?.serviceRate ?? "0.00",
					checkoutInited: true,
				},
			};

			const requestedStepper = {
				filledSteps: stepper?.filledSteps ?? [],
				currentStep: stepper?.currentStep ?? TCheckoutStep.contactInfo,
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

			const normalizedStepper = {
				...requestedStepper,
				currentStep: normalizedCurrentStep,
			};

			const data = {
				items: items,
				order: {...initialOrder},
				currency: {
					currency_id: 0,
					alias: "CAD",
					code: 4217,
				},
				localeSettings: {
					money: {
						decimal: ".",
						thousand: ",",
						precision: 2,
						format: "%s%v",
						symbol: "$",
					},
				},
				stepper: normalizedStepper,
				stepWarning,
				total: checkoutData?.total
					? checkoutData.total
					: ({
							price: checkoutDataOrder?.total_price
								? checkoutDataOrder?.total_price
								: orderTotal,
							itemsSubTotal: {
								price:
									checkoutDataOrder?.tax_calculations?.itemsSubTotal.price ??
									cartTotal.total,
								qty: cartTotal.qty,
							},
							discount: checkoutDataOrder?.discount_for_order ?? "0",
							tax: tax,
							servicesSubTotal: {
								price: checkoutDataOrderService
									? checkoutDataOrderService.total_price
									: 0,
								qty: checkoutDataOrderService
									? checkoutDataOrderService.qty
									: 0,
							},
						} as unknown as ITotal),
			};
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
