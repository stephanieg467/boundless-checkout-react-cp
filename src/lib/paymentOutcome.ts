import {ITotal} from "boundless-api-client";
import {IOrderWithCustmAttr} from "../types/Order";

export type CheckoutSessionPaymentState = {
  order: IOrderWithCustmAttr;
  total: ITotal;
};

export type PaymentMethodOption = {
  payment_method_id: string;
  title: string;
};

export type CreditCardPaymentOutcome = {
  paidAt: string;
  tip?: string;
};

export type CompleteCreditCardPaymentOutcomeInput = {
  paymentMethodId: string;
  paymentMethod?: PaymentMethodOption;
  tip?: string;
  deliveryTime?: string;
};

export class PaymentOutcomeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentOutcomeError";
  }
}

const ZERO_TIP = "0.00";

const parseAmount = (value: string | number | null | undefined): number => {
  if (value === undefined || value === null || value === "") return 0;

  const amount = Number.parseFloat(String(value));
  if (Number.isNaN(amount)) {
    throw new PaymentOutcomeError(`Invalid payment amount: ${value}`);
  }

  return amount;
};

const formatMoney = (amount: number): string => amount.toFixed(2);

const formatTip = (amount: number): string => (amount > 0 ? amount.toString() : ZERO_TIP);

const amountsMatch = (
  left: string | number | null | undefined,
  right: string | number | null | undefined,
): boolean => formatMoney(parseAmount(left)) === formatMoney(parseAmount(right));

export const applyCreditCardTipToSession = (
  session: CheckoutSessionPaymentState,
  submittedTip?: string,
): CheckoutSessionPaymentState => {
  const submittedTipAmount = parseAmount(submittedTip);
  const existingTipAmount = parseAmount(session.order.tip);
  const orderAlreadyHasTip = existingTipAmount > 0;

  if (orderAlreadyHasTip && !amountsMatch(session.order.tip, submittedTip)) {
    throw new PaymentOutcomeError(
      "Submitted tip does not match the tip already recorded on this order.",
    );
  }

  if (orderAlreadyHasTip || submittedTipAmount <= 0) {
    return {
      order: {
        ...session.order,
        tip: orderAlreadyHasTip ? session.order.tip : ZERO_TIP,
      },
      total: {...session.total},
    };
  }

  return {
    order: {
      ...session.order,
      tip: formatTip(submittedTipAmount),
      total_price: formatMoney(parseAmount(session.order.total_price) + submittedTipAmount),
    },
    total: {
      ...session.total,
      price: formatMoney(parseAmount(session.total.price) + submittedTipAmount),
    },
  };
};

export const recordCreditCardPaymentOutcome = (
  session: CheckoutSessionPaymentState,
  outcome: CreditCardPaymentOutcome,
): CheckoutSessionPaymentState => {
  const tippedSession = applyCreditCardTipToSession(session, outcome.tip);

  return {
    order: {
      ...tippedSession.order,
      paid_at: outcome.paidAt,
    },
    total: tippedSession.total,
  };
};

export const completeCreditCardPaymentOutcome = (
  session: CheckoutSessionPaymentState,
  input: CompleteCreditCardPaymentOutcomeInput,
): CheckoutSessionPaymentState => {
  const tippedSession = applyCreditCardTipToSession(session, input.tip);

  return {
    order: {
      ...tippedSession.order,
      paymentMethod: input.paymentMethod as IOrderWithCustmAttr["paymentMethod"],
      payment_method_id: input.paymentMethodId,
      ...(input.deliveryTime ? {delivery_time: input.deliveryTime} : {}),
      custom_attrs: {
        ...tippedSession.order.custom_attrs,
        checkoutCompleted: true,
      },
    },
    total: tippedSession.total,
  };
};