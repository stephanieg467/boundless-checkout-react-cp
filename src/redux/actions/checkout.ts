import { AppThunk } from "../store";
import {
	setCheckoutData,
	setCheckoutInited,
	setGlobalError,
} from "../reducers/app";
import { TClickedElement } from "../../lib/elementEvents";
import { getCartOrRetrieve } from "../../hooks/getCartOrRetrieve";
import { ITotal, TCheckoutStep, TPublishingStatus } from "boundless-api-client";
import { getCheckoutData } from "../../hooks/checkoutData";
import { IOrderWithCustmAttr } from "../../types/Order";
import { getOrderTaxes } from "../../lib/taxes";

export const initCheckoutByCart =
	(): AppThunk => async (dispatch, getState) => {
		const { cartId, onCheckoutInited, onHide, order, stepper } = getState().app;

		// const customerAuthToken = Cookie.get(userCookieName);

		const cart = getCartOrRetrieve();

		try {
			if (!cart || !cart.items?.length) {
				dispatch(
					setGlobalError(
						"Your cart is empty. Please go back to the site and start shopping."
					)
				);
				return;
			}

			const { items, total: cartTotal, taxAmount: cartTaxAmount } = cart;
			const checkoutData = getCheckoutData();
			const checkoutDataOrder = checkoutData?.order;
			
			let totalOrderTaxes = checkoutDataOrder?.tax_amount ?? cartTaxAmount;
			if (!totalOrderTaxes) {
				totalOrderTaxes = await getOrderTaxes(items)
			}

			const tax = {
				totalTaxAmount: totalOrderTaxes,
				itemsWithTax: items,
				shipping: {
					shippingTaxes: checkoutDataOrder?.tax_calculations?.tax?.shipping?.shippingTaxes,
				},
			};

			const checkoutDataOrderService = checkoutDataOrder?.services?.[0] ?? null;

			const initialOrder = {
				id: cartId ?? "",
				status_id: null,
				payment_method_id: checkoutDataOrder?.payment_method_id ?? "0",
				service_total_price: checkoutDataOrder?.service_total_price ?? "0.00",
				payment_mark_up: null,
				total_price: checkoutDataOrder?.total_price ? checkoutDataOrder?.total_price : (Number(cartTotal.total) + Number(totalOrderTaxes)).toString(),
				tip: checkoutDataOrder?.tip ?? "0.00",
				discount_for_order: null,
				tax_amount: totalOrderTaxes,
				publishing_status: TPublishingStatus.published,
				created_at: order?.created_at ?? new Date().toISOString(),
				customer: checkoutDataOrder?.customer ?? undefined,
				discounts: [],
				services: checkoutDataOrder?.services ?? [],
				tax_calculations: {
					price: totalOrderTaxes,
					itemsSubTotal: {
						price: cartTotal.total,
						qty: cartTotal.qty,
					},
					discount: "",
					paymentMarkUp: "",
					tax: tax,
					servicesSubTotal: {
						price: checkoutDataOrderService ? checkoutDataOrderService.total_price : 0,
						qty: checkoutDataOrderService ? checkoutDataOrderService.qty : 0,
					},
				} as unknown as ITotal,
				custom_attrs: {
					shippingTax: checkoutDataOrder?.custom_attrs?.shippingTax ?? "0.00",
					serviceCode: checkoutDataOrder?.custom_attrs?.serviceCode ?? "",
					serviceRate: checkoutDataOrder?.custom_attrs?.serviceRate ?? "0.00",
					checkoutInited: true,
				}
			};

			const data = {
				items: items,
				order: { ...initialOrder } as unknown as IOrderWithCustmAttr,
				currency: {
					currency_id: 0,
					alias: "CAD",
					code: 4217,
				},
				loggedInCustomer: null,
				localeSettings: {
					money: {
						decimal: ".",
						thousand: ",",
						precision: 2,
						format: "%s%v",
						symbol: "$",
					},
				},
				hasCouponCampaigns: false,
				stepper: {
					filledSteps: stepper?.filledSteps ?? [],
					currentStep: stepper?.currentStep ?? TCheckoutStep.contactInfo,
					steps: [
						TCheckoutStep.contactInfo,
						TCheckoutStep.shippingAddress,
						TCheckoutStep.paymentMethod,
					],
				},
				total: {
					price: checkoutDataOrder?.total_price ? checkoutDataOrder?.total_price : (Number(cartTotal.total) + Number(totalOrderTaxes)).toString(),
					itemsSubTotal: {
						price: cartTotal.total,
						qty: cartTotal.qty,
					},
					discount: "0",
					paymentMarkUp: "",
					tax: tax,
					servicesSubTotal: {
						price: checkoutDataOrderService ? checkoutDataOrderService.total_price : 0,
						qty: checkoutDataOrderService ? checkoutDataOrderService.qty : 0,
					},
				} as unknown as ITotal,
			};
			dispatch(setCheckoutData(data));

			// if (data.loggedInCustomer) {
			// 	dispatch(
			// 		setLoggedInCustomer(data.loggedInCustomer, customerAuthToken!)
			// 	);
			// } else {
			// 	if (customerAuthToken) {
			// 		Cookie.remove(userCookieName);
			// 	}
			// }

			dispatch(setCheckoutInited({ isInited: true }));

			if (onCheckoutInited) {
				onCheckoutInited(data);
			}
		} catch (error) {
			console.error(error);
			if (onHide) {
				onHide(
					TClickedElement.backToCart,
					typeof error === "object" && error !== null && "message" in error
						? String((error as { message?: unknown }).message)
						: "An unknown error occurred."
				);
			} else {
				dispatch(
					setGlobalError(
						"Cannot initialize checkout. Please go back to the cart and try again."
					)
				);
			}
		}
	};
