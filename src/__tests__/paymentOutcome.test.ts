import {
  applyCreditCardTipToSession,
  completeCreditCardPaymentOutcome,
  PaymentOutcomeError,
  recordCreditCardPaymentOutcome,
} from "../lib/paymentOutcome";
import {IOrderWithCustmAttr} from "../types/Order";
import {ITotal, TPublishingStatus} from "boundless-api-client";

const makeOrder = (overrides: Partial<IOrderWithCustmAttr> = {}): IOrderWithCustmAttr => ({
  id: "order-1",
  status_id: null,
  payment_method_id: null,
  paid_at: null,
  service_total_price: "0.00",
  payment_mark_up: null,
  total_price: "100.00",
  discount_for_order: null,
  tax_amount: "0.00",
  publishing_status: TPublishingStatus.published,
  created_at: "2026-05-23T00:00:00.000Z",
  tax_calculations: null,
  custom_attrs: {},
  tip: "0.00",
  ...overrides,
});

const makeTotal = (overrides: Partial<ITotal> = {}): ITotal => ({
  price: "100.00",
  itemsSubTotal: {price: "100.00", qty: 1},
  discount: "0",
  tax: {} as any,
  servicesSubTotal: {price: 0, qty: 0},
  ...overrides,
} as unknown as ITotal);

describe("PaymentOutcome", () => {
  it("applies a new credit-card tip to order and total exactly once", () => {
    const result = applyCreditCardTipToSession(
      {order: makeOrder(), total: makeTotal()},
      "5",
    );

    expect(result.order.tip).toBe("5");
    expect(result.order.total_price).toBe("105.00");
    expect(result.total.price).toBe("105.00");
  });

  it("does not re-apply an existing matching tip", () => {
    const result = applyCreditCardTipToSession(
      {
        order: makeOrder({tip: "5", total_price: "105.00"}),
        total: makeTotal({price: "105.00"}),
      },
      "5.00",
    );

    expect(result.order.tip).toBe("5");
    expect(result.order.total_price).toBe("105.00");
    expect(result.total.price).toBe("105.00");
  });

  it("rejects a submitted tip that differs from the existing order tip", () => {
    expect(() =>
      applyCreditCardTipToSession(
        {
          order: makeOrder({tip: "5", total_price: "105.00"}),
          total: makeTotal({price: "105.00"}),
        },
        "7",
      ),
    ).toThrow(PaymentOutcomeError);
  });

  it("records Payfirma approval as paid while leaving checkout incomplete", () => {
    const result = recordCreditCardPaymentOutcome(
      {order: makeOrder(), total: makeTotal()},
      {paidAt: "2026-05-23T12:00:00.000Z", tip: "5"},
    );

    expect(result.order.paid_at).toBe("2026-05-23T12:00:00.000Z");
    expect(result.order.custom_attrs.checkoutCompleted).toBeUndefined();
    expect(result.order.total_price).toBe("105.00");
    expect(result.total.price).toBe("105.00");
  });

  it("completes a paid credit-card CheckoutSession without double-applying the tip", () => {
    const result = completeCreditCardPaymentOutcome(
      {
        order: makeOrder({
          paid_at: "2026-05-23T12:00:00.000Z",
          tip: "5",
          total_price: "105.00",
        }),
        total: makeTotal({price: "105.00"}),
      },
      {
        paymentMethodId: "5",
        paymentMethod: {payment_method_id: "5", title: "Credit Card"},
        tip: "5.00",
        deliveryTime: "1:00 PM",
      },
    );

    expect(result.order.payment_method_id).toBe("5");
    expect(result.order.paymentMethod).toEqual({payment_method_id: "5", title: "Credit Card"});
    expect(result.order.delivery_time).toBe("1:00 PM");
    expect(result.order.custom_attrs.checkoutCompleted).toBe(true);
    expect(result.order.total_price).toBe("105.00");
    expect(result.total.price).toBe("105.00");
  });
});
