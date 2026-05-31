import React from "react";
// This is a test-environment workaround for the existing component runtime and not part of production behavior.
global.React = React;
import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {TPublishingStatus} from "boundless-api-client";
import PaymentMethodForm from "./PaymentMethodForm";
import {CREDIT_CARD_PAYMENT_METHOD, DELIVERY_ID, PAY_IN_STORE_PAYMENT_METHOD} from "../../constants";
import {PaymentValidationError, PaymentOutcomeError, completeCreditCardPaymentOutcome} from "../../lib/paymentOutcome";

const mockDispatch = jest.fn();
let mockState: any = {};
let mockCheckoutData: any = {};
const mockOnThankYouPage = jest.fn();
const mockSubmitPayment = jest.fn();
const mockRecordApprovedPayment = jest.fn();

jest.mock("../../hooks/redux", () => ({
  useAppSelector: (selector: any) => selector(mockState),
  useAppDispatch: () => mockDispatch,
}));

jest.mock("../../lib/paymentOutcome", () => {
  const original = jest.requireActual("../../lib/paymentOutcome");
  return {
    ...original,
    completeCreditCardPaymentOutcome: jest.fn(original.completeCreditCardPaymentOutcome),
  };
});

jest.mock("../../hooks/checkoutData", () => ({
  getCheckoutData: jest.fn(() => mockCheckoutData),
  setLocalStorageCheckoutData: jest.fn((updates) => {
    mockCheckoutData = {...mockCheckoutData, ...updates};
  }),
}));

jest.mock("../../contexts/CheckoutConfigContext", () => ({
  useCheckoutConfig: () => ({
    onThankYouPage: mockOnThankYouPage,
    payfirmaInfo: {token: "payfirma-api-key", environment: "TEST", endpoint: ""},
  }),
}));

jest.mock("../../hooks/useDeliveryTimes", () => ({
  useDeliveryTimes: () => ({
    isLoading: false,
    isError: false,
    data: {
      isNextDay: false,
      times: ["10:00 AM", "11:00 AM"],
    },
  }),
}));

jest.mock("../../hooks/useCreditCardPaymentOutcome", () => ({
  useCreditCardPaymentOutcome: () => ({
    recordApprovedPayment: mockRecordApprovedPayment,
  }),
}));

jest.mock("./PayHQ/PayHQ", () => {
  const React = require("react");

  // The PayHQ mock only resolves `submitPayment()`.
  // PaymentMethodForm records the payment approval from that result,
  // serving as a single source of truth.
  return {
    __esModule: true,
    default: React.forwardRef((_props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        submitPayment: mockSubmitPayment,
      }));
      return <div data-testid="payhq">PayHQ mock</div>;
    }),
  };
});

const creditCardMethod = {
  payment_method_id: CREDIT_CARD_PAYMENT_METHOD,
  title: "Credit Card",
} as any;

const payInStoreMethod = {
  payment_method_id: PAY_IN_STORE_PAYMENT_METHOD,
  title: "Pay in store",
} as any;

function makeOrder(overrides: any = {}) {
  return {
    id: "order-1",
    status_id: null,
    payment_method_id: CREDIT_CARD_PAYMENT_METHOD,
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
    services: [],
    customer: {
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
    },
    ...overrides,
  };
}

const total = {
  price: "100.00",
  itemsSubTotal: {price: "100.00", qty: 1},
  discount: "0",
  tax: {totalTaxAmount: "0.00"},
  servicesSubTotal: {price: "0.00", qty: 0},
} as any;

const items: any[] = [];

function setup({
  order = makeOrder(),
  paymentMethods = [creditCardMethod],
}: {
  order?: any;
  paymentMethods?: any[];
} = {}) {
  mockState = {app: {order, total, items}};
  mockCheckoutData = {order, total, items};

  return render(
    <PaymentMethodForm
      paymentPage={{paymentMethods} as any}
    />,
  );
}

describe("PaymentMethodForm shared PayHQ submit button", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitPayment.mockResolvedValue({paidAt: "2026-05-23T12:00:00.000Z"});
    mockRecordApprovedPayment.mockImplementation(({paidAt}: {paidAt: string}) => {
      mockCheckoutData = {
        ...mockCheckoutData,
        order: {...mockCheckoutData.order, paid_at: paidAt},
      };
    });
    mockOnThankYouPage.mockResolvedValue(undefined);
  });

  it("uses the single visible button to pay by card and complete checkout", async () => {
    const user = userEvent.setup();

    setup();

    expect(screen.getByTestId("payhq")).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: /^pay$/i})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: /^complete order$/i})).not.toBeInTheDocument();

    const actionButtons = screen.getAllByRole("button").filter(b => b.textContent?.match(/pay|complete/i));
    expect(actionButtons).toHaveLength(1);

    await user.click(screen.getByRole("button", {name: /^pay and complete order$/i}));

    await waitFor(() => {
      expect(mockSubmitPayment).toHaveBeenCalledTimes(1);
    });
    expect(mockRecordApprovedPayment).toHaveBeenCalledTimes(1);
    expect(mockRecordApprovedPayment).toHaveBeenCalledWith({
      paidAt: "2026-05-23T12:00:00.000Z",
      tip: "",
    });

    await waitFor(() => {
      expect(mockOnThankYouPage).toHaveBeenCalledTimes(1);
    });

    const [checkoutArg] = mockOnThankYouPage.mock.calls[0];
    expect(checkoutArg.order.paid_at).toBe("2026-05-23T12:00:00.000Z");
    expect(checkoutArg.order.custom_attrs.checkoutCompleted).toBe(true);

    expect(mockRecordApprovedPayment.mock.invocationCallOrder[0]).toBeLessThan(
      mockOnThankYouPage.mock.invocationCallOrder[0]
    );
  });

  it("validates delivery time before submitting PayHQ payment", async () => {
    const user = userEvent.setup();
    const deliveryOrder = makeOrder({
      delivery_time: "",
      services: [{service_id: DELIVERY_ID, serviceDelivery: {delivery: {title: "Delivery"}}}],
    });

    setup({order: deliveryOrder});

    await user.click(screen.getByRole("button", {name: /^pay and complete order$/i}));

    expect(await screen.findByText("Delivery time is required")).toBeInTheDocument();
    expect(mockSubmitPayment).not.toHaveBeenCalled();
    expect(mockRecordApprovedPayment).not.toHaveBeenCalled();
    expect(mockOnThankYouPage).not.toHaveBeenCalled();
  });

  it("keeps the shared button busy after thank-you callback resolves", async () => {
    const user = userEvent.setup();
    let resolveThankYou!: () => void;
    const thankYouPromise = new Promise<void>((resolve) => {
      resolveThankYou = resolve;
    });
    mockOnThankYouPage.mockReturnValue(thankYouPromise);

    setup();

    const button = screen.getByRole("button", {name: /^pay and complete order$/i});
    await user.click(button);

    await waitFor(() => expect(mockOnThankYouPage).toHaveBeenCalledTimes(1));
    expect(button).toBeDisabled();
    expect(screen.getByLabelText("Loading…")).toBeInTheDocument();

    await act(async () => {
      resolveThankYou();
      await thankYouPromise;
    });

    expect(button).toBeDisabled();
    expect(screen.getByLabelText("Loading…")).toBeInTheDocument();
  });

  it("retries only checkout completion after card approval when checkout completion fails", async () => {
    const user = userEvent.setup();
    mockOnThankYouPage
      .mockRejectedValueOnce(new Error("temporary checkout failure"))
      .mockResolvedValueOnce(undefined);

    setup();

    const button = screen.getByRole("button", {name: /^pay and complete order$/i});
    await user.click(button);

    expect(await screen.findByText("Unable to complete your order. Please try again.")).toBeInTheDocument();
    expect(mockSubmitPayment).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", {name: /^complete order$/i}));

    await waitFor(() => expect(mockOnThankYouPage).toHaveBeenCalledTimes(2));
    expect(mockSubmitPayment).toHaveBeenCalledTimes(1);
    expect(mockRecordApprovedPayment).toHaveBeenCalledTimes(1);
  });

  it("keeps non-credit-card methods on the normal Formik submit path", async () => {
    const user = userEvent.setup();
    const order = makeOrder({payment_method_id: PAY_IN_STORE_PAYMENT_METHOD});

    setup({order, paymentMethods: [payInStoreMethod, creditCardMethod]});

    expect(screen.queryByTestId("payhq")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: /^complete order$/i}));

    expect(mockSubmitPayment).not.toHaveBeenCalled();
    expect(mockRecordApprovedPayment).not.toHaveBeenCalled();
    await waitFor(() => expect(mockOnThankYouPage).toHaveBeenCalledTimes(1));
  });

  it("updates non-credit-card checkout completion data with a tip", async () => {
    const user = userEvent.setup();
    const order = makeOrder({
      payment_method_id: PAY_IN_STORE_PAYMENT_METHOD,
      services: [{service_id: DELIVERY_ID, serviceDelivery: {delivery: {title: "Delivery"}}}],
      delivery_time: "10:00 AM",
      total_price: "100.00",
    });

    setup({order, paymentMethods: [payInStoreMethod, creditCardMethod]});

    const tipInput = screen.getByRole("spinbutton", {name: /tip/i});
    await user.clear(tipInput);
    await user.type(tipInput, "15.00");

    await user.click(screen.getByRole("button", {name: /^complete order$/i}));

    await waitFor(() => expect(mockOnThankYouPage).toHaveBeenCalledTimes(1));

    const [checkoutArg] = mockOnThankYouPage.mock.calls[0];

    expect(checkoutArg.order.tip).toBe("15");
    expect(checkoutArg.order.total_price).toBe("115");
    expect(checkoutArg.total.price).toBe("115");
  });

  it("drops PayHQ validation errors silently", async () => {
    const user = userEvent.setup();
    mockSubmitPayment.mockRejectedValue(new PaymentValidationError("Required payment fields are missing."));

    setup();

    await user.click(screen.getByRole("button", {name: /^pay and complete order$/i}));

    await waitFor(() => expect(mockSubmitPayment).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders server error alert for unhandled PayHQ submit errors", async () => {
    const user = userEvent.setup();
    mockSubmitPayment.mockRejectedValue(new Error("Card declined"));

    setup();

    await user.click(screen.getByRole("button", {name: /^pay and complete order$/i}));

    await waitFor(() => expect(mockSubmitPayment).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("alert")).toHaveTextContent("Card declined");
  });

  it("handles failure to record approved payment gracefully", async () => {
    const user = userEvent.setup();
    mockRecordApprovedPayment.mockImplementation(() => {
      throw new Error("Local storage full");
    });

    setup();

    const button = screen.getByRole("button", {name: /^pay and complete order$/i});
    await user.click(button);

    await waitFor(() => expect(mockSubmitPayment).toHaveBeenCalledTimes(1));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your payment was approved but we could not update your order. Please contact support."
    );

    // Form submission (onThankYouPage) should not have been called
    expect(mockOnThankYouPage).not.toHaveBeenCalled();

    // Button should be re-enabled
    expect(button).not.toBeDisabled();
    expect(screen.queryByLabelText("Loading…")).not.toBeInTheDocument();
  });

  it("renders error banner when session data is missing on submit", async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      setup({
        order: null,
        paymentMethods: [payInStoreMethod]
      });

      const button = screen.getByRole("button", {name: /^complete order$/i});
      await user.click(button);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[useSavePaymentMethod] Missing checkout session data at submission",
        {
          hasOrder: false,
          hasCheckoutDataOrder: false,
          hasTotal: true,
        }
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Unable to complete your order. Please refresh and try again."
      );
      expect(mockOnThankYouPage).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("handles PaymentOutcomeError with a specific support error message", async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Force checkout completion logic to throw PaymentOutcomeError
    (completeCreditCardPaymentOutcome as jest.Mock).mockImplementationOnce(() => {
      throw new PaymentOutcomeError("tip mismatch");
    });

    try {
      setup({
        order: { ...makeOrder(), paid_at: "2026-05-23T12:00:00.000Z" }, // Payment already approved
        paymentMethods: [creditCardMethod],
      });

      // Submit form
      const button = screen.getByRole("button", {name: /^complete order$/i});
      await user.click(button);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[useSavePaymentMethod] PaymentOutcomeError during checkout completion",
        expect.any(PaymentOutcomeError)
      );

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Order data error: tip mismatch Please contact support.");
      expect(alert).not.toHaveTextContent("Please try again.");

      expect(mockOnThankYouPage).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
