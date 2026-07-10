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

const findDeliveryTimeOptionByLabel = (
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
	let originalShippingRate = "0.00";
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
		originalShippingRate = shippingRate;
		shippingTax = requiresFee ? DELIVERY_TAX : 0;
	} else if (deliveryId === SHIPPING_DELIVERY_ID) {
		const freeShippingApplies = qualifiesForFreeShipping(total);
		shippingRate = freeShippingApplies ? "0.00" : SHIPPING_COST;
		originalShippingRate = SHIPPING_COST;
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
		originalShippingRate,
		shippingTax,
		totalOrderTaxes,
		totalOrderPrice,
	};
};
