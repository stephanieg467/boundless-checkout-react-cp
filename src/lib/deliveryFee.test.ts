import type {ITotal} from "boundless-api-client";
import {
  DELIVERY_COST,
  DELIVERY_ID,
  SELF_PICKUP_ID,
  SHIPPING_COST,
  SHIPPING_DELIVERY_ID,
} from "../constants";
import type {IOrderWithCustmAttr} from "../types/Order";
import {
  calculateCheckoutShippingTotals,
  selectedDeliveryTimesRequireFee,
} from "./deliveryFee";
import {ASAP_DELIVERY_LABEL, type DeliveryTimeOption} from "./deliveryTimes";

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

const defaultOrder: TestOrder = {
  tax_amount: "1.00",
  delivery_time: feeRequired.label,
  custom_attrs: {},
};
const defaultTotal = {itemsSubTotal: {price: "20.00"}} as ITotal;
const defaultRegularOptions = [feeRequired, feeFree];
const defaultDropShipOptions = [dropShipFeeRequired, dropShipFeeFree];

const defaultSelection = {
  isDelivery: true,
  hasRegularItems: true,
  hasDropShipItems: false,
  deliveryTime: feeRequired.label,
  regularOptions: defaultRegularOptions,
  dropShipOptions: defaultDropShipOptions,
};

type DeliveryFeeSelectionOverrides = Partial<
  Parameters<typeof selectedDeliveryTimesRequireFee>[0]
>;

const deliveryFeeApplies = (overrides: DeliveryFeeSelectionOverrides = {}) =>
  selectedDeliveryTimesRequireFee({...defaultSelection, ...overrides});

type CalculateTotalsOverrides = Partial<
  Omit<Parameters<typeof calculateCheckoutShippingTotals>[0], "order">
> & {
  order?: Partial<TestOrder>;
};

const calculateTotals = ({
  order: orderOverrides = {},
  ...overrides
}: CalculateTotalsOverrides = {}) => {
  const order = {...defaultOrder, ...orderOverrides};

  return calculateCheckoutShippingTotals({
    deliveryId: DELIVERY_ID,
    total: defaultTotal,
    hasRegularItems: true,
    hasDropShipItems: false,
    regularOptions: defaultRegularOptions,
    dropShipOptions: defaultDropShipOptions,
    ...overrides,
    order: order as IOrderWithCustmAttr,
    deliveryTime: order.delivery_time,
    dropShipDeliveryTime: order.drop_ship_delivery_time,
  });
};

describe("delivery fee calculation", () => {
  it("requires the $4 Delivery fee when the selected option applies the fee", () => {
    expect(deliveryFeeApplies({deliveryTime: feeRequired.label})).toBe(true);

    const result = calculateTotals({
      order: {delivery_time: feeRequired.label},
    });

    expect(result.shippingRate).toBe(DELIVERY_COST);
    expect(result.shippingTax).toBe(0.2);
  });

  it("waives the Delivery fee when the selected option is fee-free", () => {
    expect(deliveryFeeApplies({deliveryTime: feeFree.label})).toBe(false);

    const result = calculateTotals({
      order: {delivery_time: feeFree.label},
    });

    expect(result.shippingRate).toBe("0.00");
    expect(result.shippingTax).toBe(0);
  });

  it("defaults to applying the fee when metadata is missing or the selected label is unmatched", () => {
    const missingMetadata = {
      label: "metadata missing",
    } as DeliveryTimeOption;

    expect(
      deliveryFeeApplies({
        deliveryTime: missingMetadata.label,
        regularOptions: [missingMetadata],
      }),
    ).toBe(true);
    expect(
      calculateTotals({
        order: {delivery_time: missingMetadata.label},
        regularOptions: [missingMetadata],
      }).shippingRate,
    ).toBe(DELIVERY_COST);

    expect(
      deliveryFeeApplies({
        deliveryTime: "unlisted option",
        regularOptions: [feeFree],
      }),
    ).toBe(true);
    expect(
      calculateTotals({
        order: {delivery_time: "unlisted option"},
        regularOptions: [feeFree],
      }).shippingRate,
    ).toBe(DELIVERY_COST);
  });

  it("uses only delivery_time for a regular-only cart", () => {
    expect(
      deliveryFeeApplies({
        hasRegularItems: true,
        hasDropShipItems: false,
        deliveryTime: feeFree.label,
        dropShipDeliveryTime: dropShipFeeRequired.label,
      }),
    ).toBe(false);

    const result = calculateTotals({
      hasRegularItems: true,
      hasDropShipItems: false,
      order: {
        delivery_time: feeFree.label,
        drop_ship_delivery_time: dropShipFeeRequired.label,
      },
    });

    expect(result.shippingRate).toBe("0.00");
  });

  it("uses only drop_ship_delivery_time for a drop-ship-only cart", () => {
    expect(
      deliveryFeeApplies({
        hasRegularItems: false,
        hasDropShipItems: true,
        deliveryTime: feeRequired.label,
        dropShipDeliveryTime: dropShipFeeFree.label,
      }),
    ).toBe(false);

    const result = calculateTotals({
      hasRegularItems: false,
      hasDropShipItems: true,
      order: {
        delivery_time: feeRequired.label,
        drop_ship_delivery_time: dropShipFeeFree.label,
      },
    });

    expect(result.shippingRate).toBe("0.00");
  });

  it.each([
    [feeRequired.label, dropShipFeeFree.label],
    [feeFree.label, dropShipFeeRequired.label],
  ])(
    "applies the fee for a mixed cart when either selected relevant field requires it (%s / %s)",
    (deliveryTime, dropShipDeliveryTime) => {
      expect(
        deliveryFeeApplies({
          hasRegularItems: true,
          hasDropShipItems: true,
          deliveryTime,
          dropShipDeliveryTime,
        }),
      ).toBe(true);

      const result = calculateTotals({
        hasRegularItems: true,
        hasDropShipItems: true,
        order: {
          delivery_time: deliveryTime,
          drop_ship_delivery_time: dropShipDeliveryTime,
        },
      });

      expect(result.shippingRate).toBe(DELIVERY_COST);
    },
  );

  it.each([
    {applyDeliveryFee: true, expectedRate: DELIVERY_COST, expectedShippingTax: 0.2},
    {applyDeliveryFee: false, expectedRate: "0.00", expectedShippingTax: 0},
  ])(
    "treats ASAP as a regular delivery option label for mixed carts when applyDeliveryFee is $applyDeliveryFee",
    ({applyDeliveryFee, expectedRate, expectedShippingTax}) => {
      const asapOption: DeliveryTimeOption = {
        label: ASAP_DELIVERY_LABEL,
        applyDeliveryFee,
      };

      expect(
        deliveryFeeApplies({
          hasRegularItems: true,
          hasDropShipItems: true,
          deliveryTime: ASAP_DELIVERY_LABEL,
          dropShipDeliveryTime: dropShipFeeFree.label,
          regularOptions: [asapOption],
        }),
      ).toBe(applyDeliveryFee);

      const result = calculateTotals({
        hasRegularItems: true,
        hasDropShipItems: true,
        regularOptions: [asapOption],
        order: {
          delivery_time: ASAP_DELIVERY_LABEL,
          drop_ship_delivery_time: dropShipFeeFree.label,
        },
      });

      expect(result.shippingRate).toBe(expectedRate);
      expect(result.shippingTax).toBe(expectedShippingTax);
    },
  );

  it("waives the fee for a mixed cart only when both selected relevant fields are fee-free", () => {
    expect(
      deliveryFeeApplies({
        hasRegularItems: true,
        hasDropShipItems: true,
        deliveryTime: feeFree.label,
        dropShipDeliveryTime: dropShipFeeFree.label,
      }),
    ).toBe(false);

    const result = calculateTotals({
      hasRegularItems: true,
      hasDropShipItems: true,
      order: {
        delivery_time: feeFree.label,
        drop_ship_delivery_time: dropShipFeeFree.label,
      },
    });

    expect(result.shippingRate).toBe("0.00");
  });

  it("does not let delivery-time metadata affect Pickup or Shipping rates", () => {
    expect(
      deliveryFeeApplies({
        isDelivery: false,
        deliveryTime: feeRequired.label,
      }),
    ).toBe(false);

    const pickup = calculateTotals({
      deliveryId: SELF_PICKUP_ID,
      order: {delivery_time: feeRequired.label},
    });
    const shipping = calculateTotals({
      deliveryId: SHIPPING_DELIVERY_ID,
      order: {delivery_time: feeFree.label},
    });

    expect(pickup).toMatchObject({
      shippingRate: "0.00",
      shippingTax: 0,
    });
    expect(shipping).toMatchObject({
      shippingRate: SHIPPING_COST,
      shippingTax: 0.3,
    });
  });

  it("keeps the original Shipping amount when a qualifying subtotal receives free shipping", () => {
    const result = calculateTotals({
      deliveryId: SHIPPING_DELIVERY_ID,
      total: {itemsSubTotal: {price: "100.00"}} as ITotal,
      hasRegularItems: true,
      hasDropShipItems: true,
      order: {
        tax_amount: "1.30",
        custom_attrs: {shippingTax: 0.3},
        delivery_time: feeRequired.label,
        drop_ship_delivery_time: dropShipFeeRequired.label,
      },
    });

    expect(result).toMatchObject({
      shippingRate: "0.00",
      originalShippingRate: SHIPPING_COST,
      shippingTax: 0,
      totalOrderPrice: "101.00",
    });
    expect(Number(result.totalOrderTaxes)).toBeCloseTo(1);
  });

  it("charges Shipping when the allocated coupon subtotal crosses below the free-shipping threshold", () => {
    const originalSubtotal = calculateTotals({
      deliveryId: SHIPPING_DELIVERY_ID,
      total: {itemsSubTotal: {price: "103.97"}} as ITotal,
    });
    const allocatedSubtotal = calculateTotals({
      deliveryId: SHIPPING_DELIVERY_ID,
      total: {itemsSubTotal: {price: "83.18"}} as ITotal,
    });

    expect(originalSubtotal).toMatchObject({
      shippingRate: "0.00",
      originalShippingRate: SHIPPING_COST,
      shippingTax: 0,
    });
    expect(allocatedSubtotal).toMatchObject({
      shippingRate: SHIPPING_COST,
      originalShippingRate: SHIPPING_COST,
      shippingTax: 0.3,
      totalOrderPrice: "90.48",
    });
  });

  it("subtracts the previous custom_attrs.shippingTax before adding the new shipping tax", () => {
    const result = calculateTotals({
      order: {
        tax_amount: "1.50",
        custom_attrs: {shippingTax: 0.3},
        delivery_time: feeRequired.label,
      },
    });

    expect(Number(result.totalOrderTaxes)).toBeCloseTo(1.4);
    expect(result.totalOrderPrice).toBe("25.40");
  });
});
