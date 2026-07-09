import {DELIVERY_COST, SHIPPING_COST} from "../constants";
import {calculateDeliveryFeeTotals} from "./deliveryFee";
import type {DeliveryTimeOption} from "./deliveryTimes";

type DeliveryTitle = "Delivery" | "Shipping" | "Self Pickup";

type TestOrder = {
  tax_amount: string;
  delivery_time?: string;
  drop_ship_delivery_time?: string;
  custom_attrs?: {shippingTax?: number | string};
};

const feeRequired: DeliveryTimeOption = {
  label: "5pm - 6pm",
  applyDeliveryFee: true,
};
const feeFree: DeliveryTimeOption = {
  label: "6pm - 7pm",
  applyDeliveryFee: false,
};
const dropShipFeeRequired: DeliveryTimeOption = {
  label: "Friday 1pm - 2pm",
  applyDeliveryFee: true,
};
const dropShipFeeFree: DeliveryTimeOption = {
  label: "Friday 2pm - 3pm",
  applyDeliveryFee: false,
};

const calculate = (overrides: {
  deliveryTitle?: DeliveryTitle;
  hasRegularItems?: boolean;
  hasDropShipItems?: boolean;
  order?: Partial<TestOrder>;
  deliveryTimes?: DeliveryTimeOption[];
  dropShipDeliveryTimes?: DeliveryTimeOption[];
} = {}) => {
  const order: TestOrder = {
    tax_amount: "1.00",
    delivery_time: feeRequired.label,
    custom_attrs: {},
    ...overrides.order,
  };

  return calculateDeliveryFeeTotals({
    deliveryTitle: overrides.deliveryTitle ?? "Delivery",
    order,
    total: {itemsSubTotal: {price: "20.00"}},
    hasRegularItems: overrides.hasRegularItems ?? true,
    hasDropShipItems: overrides.hasDropShipItems ?? false,
    deliveryTimes: overrides.deliveryTimes ?? [feeRequired, feeFree],
    dropShipDeliveryTimes: overrides.dropShipDeliveryTimes ?? [
      dropShipFeeRequired,
      dropShipFeeFree,
    ],
  });
};

describe("delivery fee calculation", () => {
  it("requires the $4 Delivery fee when the selected option applies the fee", () => {
    const result = calculate({
      order: {delivery_time: feeRequired.label},
    });

    expect(result.deliveryFeeApplies).toBe(true);
    expect(result.shippingRate).toBe(DELIVERY_COST);
    expect(result.shippingTax).toBe(0.2);
  });

  it("waives the Delivery fee when the selected option is fee-free", () => {
    const result = calculate({
      order: {delivery_time: feeFree.label},
    });

    expect(result.deliveryFeeApplies).toBe(false);
    expect(result.shippingRate).toBe("0.00");
    expect(result.shippingTax).toBe(0);
  });

  it("defaults to applying the fee when metadata is missing or the selected label is unmatched", () => {
    const missingMetadata = {
      label: "metadata missing",
    } as DeliveryTimeOption;

    expect(
      calculate({
        order: {delivery_time: missingMetadata.label},
        deliveryTimes: [missingMetadata],
      }).deliveryFeeApplies,
    ).toBe(true);

    expect(
      calculate({
        order: {delivery_time: "unlisted option"},
        deliveryTimes: [feeFree],
      }).deliveryFeeApplies,
    ).toBe(true);
  });

  it("uses only delivery_time for a regular-only cart", () => {
    const result = calculate({
      hasRegularItems: true,
      hasDropShipItems: false,
      order: {
        delivery_time: feeFree.label,
        drop_ship_delivery_time: dropShipFeeRequired.label,
      },
    });

    expect(result.deliveryFeeApplies).toBe(false);
    expect(result.shippingRate).toBe("0.00");
  });

  it("uses only drop_ship_delivery_time for a drop-ship-only cart", () => {
    const result = calculate({
      hasRegularItems: false,
      hasDropShipItems: true,
      order: {
        delivery_time: feeRequired.label,
        drop_ship_delivery_time: dropShipFeeFree.label,
      },
    });

    expect(result.deliveryFeeApplies).toBe(false);
    expect(result.shippingRate).toBe("0.00");
  });

  it.each([
    [feeRequired.label, dropShipFeeFree.label],
    [feeFree.label, dropShipFeeRequired.label],
  ])(
    "applies the fee for a mixed cart when either selected relevant field requires it (%s / %s)",
    (deliveryTime, dropShipDeliveryTime) => {
      const result = calculate({
        hasRegularItems: true,
        hasDropShipItems: true,
        order: {
          delivery_time: deliveryTime,
          drop_ship_delivery_time: dropShipDeliveryTime,
        },
      });

      expect(result.deliveryFeeApplies).toBe(true);
      expect(result.shippingRate).toBe(DELIVERY_COST);
    },
  );

  it("waives the fee for a mixed cart only when both selected relevant fields are fee-free", () => {
    const result = calculate({
      hasRegularItems: true,
      hasDropShipItems: true,
      order: {
        delivery_time: feeFree.label,
        drop_ship_delivery_time: dropShipFeeFree.label,
      },
    });

    expect(result.deliveryFeeApplies).toBe(false);
    expect(result.shippingRate).toBe("0.00");
  });

  it("does not let delivery-time metadata affect Pickup or Shipping rates", () => {
    const pickup = calculate({
      deliveryTitle: "Self Pickup",
      order: {delivery_time: feeRequired.label},
    });
    const shipping = calculate({
      deliveryTitle: "Shipping",
      order: {delivery_time: feeFree.label},
    });

    expect(pickup).toMatchObject({
      deliveryFeeApplies: false,
      shippingRate: "0.00",
      shippingTax: 0,
    });
    expect(shipping).toMatchObject({
      deliveryFeeApplies: false,
      shippingRate: SHIPPING_COST,
      shippingTax: 0.3,
    });
  });

  it("subtracts the previous custom_attrs.shippingTax before adding the new shipping tax", () => {
    const result = calculate({
      order: {
        tax_amount: "1.50",
        custom_attrs: {shippingTax: 0.3},
        delivery_time: feeRequired.label,
      },
    });

    expect(Number(result.taxAmount)).toBeCloseTo(1.4);
    expect(result.totalPrice).toBe("25.40");
  });
});
