import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import {TCheckoutStep} from "../types/common";

// ── mocks ──────────────────────────────────────────────────────────────
jest.mock("../hooks/initCheckout", () => () => ({isInited: true}));

jest.mock("../pages/ContactInfoPage", () => () => <div data-testid="contact-info-page" />);
jest.mock("../pages/ShippingPage", () => () => <div data-testid="shipping-page" />);
jest.mock("../pages/DeliveryDetailsPage", () => () => <div data-testid="delivery-details-page" />);
jest.mock("../pages/PaymentPage", () => () => <div data-testid="payment-page" />);
jest.mock("../components/Loading", () => () => <div data-testid="loading" />);

// Controllable Redux state
let mockState: any = {};
jest.mock("../hooks/redux", () => ({
  useAppSelector: (selector: any) => selector(mockState),
}));

import StepRenderer from "../StepRenderer";

// ── helpers ─────────────────────────────────────────────────────────────
import {CheckoutConfigProvider} from "../contexts/CheckoutConfigContext";

const mockOnHide = jest.fn();
const mockOnThankYouPage = jest.fn();

const renderWithStep = (currentStep: TCheckoutStep | null, globalError: string | null = null) => {
  mockState = {
    app: {
      isInited: true,
      globalError,
      stepper: currentStep
        ? {currentStep, steps: [currentStep], filledSteps: []}
        : null,
    },
  };
  return render(
    <CheckoutConfigProvider config={{onHide: mockOnHide, onThankYouPage: mockOnThankYouPage}}>
      <StepRenderer />
    </CheckoutConfigProvider>
  );
};

// ── tests ────────────────────────────────────────────────────────────────
describe("StepRenderer scroll-to-top", () => {
  it("calls scrollTo on .bdl-checkout when currentStep changes", () => {
    const scrollToMock = jest.fn();

    const portalEl = document.createElement("div");
    portalEl.className = "bdl-checkout";
    portalEl.scrollTo = scrollToMock;
    document.body.appendChild(portalEl);

    const {rerender} = renderWithStep(TCheckoutStep.contactInfo);

    // Navigate to next step
    mockState = {
      app: {
        isInited: true,
        globalError: null,
        stepper: {currentStep: TCheckoutStep.shippingAddress, steps: [TCheckoutStep.shippingAddress], filledSteps: []},
      },
    };
    rerender(
      <CheckoutConfigProvider config={{onHide: mockOnHide, onThankYouPage: mockOnThankYouPage}}>
        <StepRenderer />
      </CheckoutConfigProvider>
    );

    expect(scrollToMock).toHaveBeenCalledWith({top: 0, behavior: "smooth"});

    document.body.removeChild(portalEl);
  });
});

describe("StepRenderer", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/checkout");
    jest.restoreAllMocks();
  });

  it("renders ContactInfoPage for contactInfo step", () => {
    renderWithStep(TCheckoutStep.contactInfo);
    expect(screen.getByTestId("contact-info-page")).toBeInTheDocument();
  });

  it("renders ShippingPage for shippingAddress step", () => {
    renderWithStep(TCheckoutStep.shippingAddress);
    expect(screen.getByTestId("shipping-page")).toBeInTheDocument();
  });

  it("renders DeliveryDetailsPage for deliveryDetails step", () => {
    renderWithStep(TCheckoutStep.deliveryDetails);
    expect(screen.getByTestId("delivery-details-page")).toBeInTheDocument();
  });

  it("renders PaymentPage for paymentMethod step", () => {
    renderWithStep(TCheckoutStep.paymentMethod);
    expect(screen.getByTestId("payment-page")).toBeInTheDocument();
  });

  it("renders loading when stepper is null", () => {
    renderWithStep(null);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders global error when globalError is set", () => {
    renderWithStep(TCheckoutStep.contactInfo, "Something went wrong");
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("does not crash for an unexpected step value", () => {
    renderWithStep("unknownStep" as TCheckoutStep);
    // Should fall back to ContactInfoPage, no throw
    expect(screen.getByTestId("contact-info-page")).toBeInTheDocument();
  });

  it.each([
    [TCheckoutStep.contactInfo, "/checkout/info"],
    [TCheckoutStep.shippingAddress, "/checkout/shipping"],
    [TCheckoutStep.deliveryDetails, "/checkout/delivery-details"],
    [TCheckoutStep.paymentMethod, "/checkout/payment"],
  ])("updates the URL for the %s checkout step", async (step, expectedPath) => {
    window.history.replaceState(null, "", "/checkout?coupon=save#summary");

    renderWithStep(step);

    await waitFor(() => {
      expect(window.location.pathname).toBe(expectedPath);
    });
    expect(window.location.search).toBe("?coupon=save");
    expect(window.location.hash).toBe("#summary");
  });

  it("does not update the URL when stepper is null", () => {
    const replaceStateSpy = jest.spyOn(window.history, "replaceState");

    renderWithStep(null);

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it("does not update the URL for an unexpected step value", () => {
    const replaceStateSpy = jest.spyOn(window.history, "replaceState");

    renderWithStep("unknownStep" as TCheckoutStep);

    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/checkout");
  });
});
