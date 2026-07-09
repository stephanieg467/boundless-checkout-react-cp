import {ITotal} from "boundless-api-client";
import {
	DELIVERY_COST,
	DELIVERY_ID,
	SHIPPING_COST,
	SHIPPING_DELIVERY_ID,
} from "../constants";
import type {IOrderWithCustmAttr} from "../types/Order";
import type {DeliveryTimeOption} from "./deliveryTimes";
import {qualifiesForFreeShipping} from "./shipping";

const DELIVERY_TAX = 0.2;
const SHIPPING_TAX = 0.3;

type DeliveryFeeOrder = Pick<
	IOrderWithCustmAttr,
	"tax_amount" | "delivery_time" | "drop_ship_delivery_time"
> & {
	custom_attrs?: {
		shippingTax?: number | string;
		[key: string]: unknown;
	};
};

type DeliveryFeeTotal = {
	itemsSubTotal?: {
		price?: string | number | null;
	};
};

export const findDeliveryTimeOptionByLabel = (
	options: DeliveryTimeOption[] | undefined,
	label: string | undefined,
): DeliveryTimeOption | undefined => {
	if (!label) return undefined;
	return options?.find((option) => option.label === label);
};

const selectedLabelRequiresFee = (
	options: DeliveryTimeOption[] | undefined,
	label: string | undefined,
): boolean => {
	const option = findDeliveryTimeOptionByLabel(options, label);
	return option?.applyDeliveryFee ?? true;
};

export const selectedDeliveryTimesRequireFee = ({
	isDelivery,
	hasRegularItems,
	hasDropShipItems,
	deliveryTime,
	dropShipDeliveryTime,
	regularOptions,
	dropShipOptions,
}: {
	isDelivery: boolean;
	hasRegularItems: boolean;
	hasDropShipItems: boolean;
	deliveryTime?: string;
	dropShipDeliveryTime?: string;
	regularOptions?: DeliveryTimeOption[];
	dropShipOptions?: DeliveryTimeOption[];
}): boolean => {
	if (!isDelivery) return false;

	const relevant: boolean[] = [];
	if (hasRegularItems) {
		relevant.push(selectedLabelRequiresFee(regularOptions, deliveryTime));
	}
	if (hasDropShipItems) {
		relevant.push(
			selectedLabelRequiresFee(dropShipOptions, dropShipDeliveryTime),
		);
	}

	return relevant.length > 0 ? relevant.some(Boolean) : true;
};

export const calculateCheckoutShippingTotals = ({
	order,
	total,
	deliveryId,
	hasRegularItems,
	hasDropShipItems,
	deliveryTime,
	dropShipDeliveryTime,
	regularOptions,
	dropShipOptions,
}: {
	order: IOrderWithCustmAttr;
	total: ITotal | undefined;
	deliveryId: number;
	hasRegularItems: boolean;
	hasDropShipItems: boolean;
	deliveryTime?: string;
	dropShipDeliveryTime?: string;
	regularOptions?: DeliveryTimeOption[];
	dropShipOptions?: DeliveryTimeOption[];
}) => {
	let shippingRate = "0.00";
	let shippingTax = 0;

	if (deliveryId === DELIVERY_ID) {
		const requiresFee = selectedDeliveryTimesRequireFee({
			isDelivery: true,
			hasRegularItems,
			hasDropShipItems,
			deliveryTime,
			dropShipDeliveryTime,
			regularOptions,
			dropShipOptions,
		});
		shippingRate = requiresFee ? DELIVERY_COST : "0.00";
		shippingTax = requiresFee ? DELIVERY_TAX : 0;
	} else if (deliveryId === SHIPPING_DELIVERY_ID) {
		const freeShippingApplies = qualifiesForFreeShipping(total);
		shippingRate = freeShippingApplies ? "0.00" : SHIPPING_COST;
		shippingTax = freeShippingApplies ? 0 : SHIPPING_TAX;
	}

	let currentTaxes = Number(order.tax_amount ?? 0);
	if (order.custom_attrs?.shippingTax) {
		currentTaxes -= Number(order.custom_attrs.shippingTax);
	}
	const totalOrderTaxes = (currentTaxes + shippingTax).toString();
	const totalOrderPrice = (
		Number(total?.itemsSubTotal?.price ?? 0) +
		Number(totalOrderTaxes) +
		Number(shippingRate)
	).toFixed(2);

	return {
		shippingRate,
		originalShippingRate: shippingRate,
		shippingTax,
		totalOrderTaxes,
		totalOrderPrice,
	};
};

const getDeliveryIdByTitle = (deliveryTitle: string | undefined): number => {
	if (deliveryTitle === "Delivery") return DELIVERY_ID;
	if (deliveryTitle === "Shipping") return SHIPPING_DELIVERY_ID;
	return 0;
};

export const calculateDeliveryFeeTotals = ({
	deliveryTitle,
	order,
	total,
	hasRegularItems,
	hasDropShipItems,
	deliveryTimes,
	dropShipDeliveryTimes,
}: {
	deliveryTitle?: string;
	order: DeliveryFeeOrder;
	total: DeliveryFeeTotal | undefined;
	hasRegularItems: boolean;
	hasDropShipItems: boolean;
	deliveryTimes?: DeliveryTimeOption[];
	dropShipDeliveryTimes?: DeliveryTimeOption[];
}) => {
	const deliveryId = getDeliveryIdByTitle(deliveryTitle);
	const deliveryFeeApplies = selectedDeliveryTimesRequireFee({
		isDelivery: deliveryId === DELIVERY_ID,
		hasRegularItems,
		hasDropShipItems,
		deliveryTime: order.delivery_time,
		dropShipDeliveryTime: order.drop_ship_delivery_time,
		regularOptions: deliveryTimes,
		dropShipOptions: dropShipDeliveryTimes,
	});
	const totals = calculateCheckoutShippingTotals({
		order: order as IOrderWithCustmAttr,
		total: total as ITotal | undefined,
		deliveryId,
		hasRegularItems,
		hasDropShipItems,
		deliveryTime: order.delivery_time,
		dropShipDeliveryTime: order.drop_ship_delivery_time,
		regularOptions: deliveryTimes,
		dropShipOptions: dropShipDeliveryTimes,
	});

	return {
		...totals,
		deliveryFeeApplies,
		taxAmount: totals.totalOrderTaxes,
		totalPrice: totals.totalOrderPrice,
	};
};
