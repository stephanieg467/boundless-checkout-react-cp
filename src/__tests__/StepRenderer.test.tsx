import React from "react";
import {render, screen} from "@testing-library/react";
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
const renderWithStep = (currentStep: TCheckoutStep | null, globalError: string | null = null) => {
  mockState = {
    app: {
      isInited: true,
      globalError,
      onHide: jest.fn(),
      stepper: currentStep
        ? {currentStep, steps: [currentStep], filledSteps: []}
        : null,
    },
  };
  return render(<StepRenderer />);
};

// ── tests ────────────────────────────────────────────────────────────────
describe("StepRenderer", () => {
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
});
