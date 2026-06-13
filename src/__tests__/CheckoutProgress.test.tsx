import React from "react";
import {render, screen, fireEvent} from "@testing-library/react";

// ── mocks ──────────────────────────────────────────────────────────────
const mockDispatch = jest.fn();
let mockState: any = {};

jest.mock("../hooks/redux", () => ({
  useAppSelector: (selector: any) => selector(mockState),
  useAppDispatch: () => mockDispatch,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

import {getCheckoutStepWarning} from "../lib/checkoutGuards";
import {setCurrentStep, setStepWarning} from "../redux/reducers/app";
import CheckoutProgress from "../components/CheckoutProgress";
import {TCheckoutStep} from "../types/common";

const completeCustomer = (overrides: Record<string, unknown> = {}) => ({
  id: "customer-1",
  email: "jane@example.com",
  created_at: "2026-01-01T00:00:00.000Z",
  first_name: "Jane",
  last_name: "Doe",
  phone: "2505551234",
  custom_attrs: {},
  addresses: [],
  dob: "1990-01-01",
  ...overrides,
});

const orderWith = (overrides: Record<string, unknown> = {}) => ({
  id: "order-1",
  status_id: null,
  payment_method_id: null,
  service_total_price: null,
  payment_mark_up: null,
  total_price: null,
  discount_for_order: null,
  tax_amount: null,
  publishing_status: "published",
  created_at: "2026-01-01T00:00:00.000Z",
  customer: completeCustomer(),
  services: [],
  tax_calculations: null,
  custom_attrs: {},
  paid_at: null,
  ...overrides,
});

const renderWithStepper = (
  currentStep: TCheckoutStep,
  steps: TCheckoutStep[],
  filledSteps: TCheckoutStep[] = [],
  order: Record<string, unknown> = orderWith(),
) => {
  mockState = {
    app: {
      stepper: {currentStep, steps, filledSteps},
      order,
      items: [],
      stepWarning: null,
    },
  };
  return render(<CheckoutProgress />);
};

const clickStep = (stepIndex: number) => {
  const buttons = screen.getAllByRole("button");
  fireEvent.click(buttons[stepIndex]);
};

describe("CheckoutProgress", () => {
  beforeEach(() => mockDispatch.mockClear());

  it("returns null when stepper is null", () => {
    mockState = {app: {stepper: null, order: orderWith(), items: [], stepWarning: null}};
    const {container} = render(<CheckoutProgress />);
    expect(container.firstChild).toBeNull();
  });

  it("marks the active step based on currentStep from Redux", () => {
    renderWithStepper(TCheckoutStep.paymentMethod, [
      TCheckoutStep.contactInfo,
      TCheckoutStep.paymentMethod,
    ]);
    // MUI Stepper renders step buttons — there should be 2
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("routes payment clicks back to contactInfo with a warning when contact is incomplete", () => {
    renderWithStepper(
      TCheckoutStep.contactInfo,
      [
        TCheckoutStep.contactInfo,
        TCheckoutStep.shippingAddress,
        TCheckoutStep.paymentMethod,
      ],
      [TCheckoutStep.contactInfo, TCheckoutStep.shippingAddress],
      orderWith({customer: undefined}),
    );

    clickStep(2);

    expect(mockDispatch).toHaveBeenCalledWith(
      setCurrentStep(TCheckoutStep.contactInfo),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setStepWarning(getCheckoutStepWarning(TCheckoutStep.contactInfo)),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setCurrentStep(TCheckoutStep.paymentMethod),
    );
  });

  it("routes payment clicks back to shippingAddress with a warning when shipping is incomplete", () => {
    renderWithStepper(
      TCheckoutStep.shippingAddress,
      [
        TCheckoutStep.contactInfo,
        TCheckoutStep.shippingAddress,
        TCheckoutStep.paymentMethod,
      ],
      [TCheckoutStep.contactInfo, TCheckoutStep.shippingAddress],
      orderWith({customer: completeCustomer(), services: []}),
    );

    clickStep(2);

    expect(mockDispatch).toHaveBeenCalledWith(
      setCurrentStep(TCheckoutStep.shippingAddress),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setStepWarning(getCheckoutStepWarning(TCheckoutStep.shippingAddress)),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setCurrentStep(TCheckoutStep.paymentMethod),
    );
  });

  it("allows backward navigation to an earlier step", () => {
    renderWithStepper(
      TCheckoutStep.paymentMethod,
      [
        TCheckoutStep.contactInfo,
        TCheckoutStep.shippingAddress,
        TCheckoutStep.paymentMethod,
      ],
      [],
      orderWith({customer: undefined, services: []}),
    );

    clickStep(0);

    expect(mockDispatch).toHaveBeenCalledWith(
      setCurrentStep(TCheckoutStep.contactInfo),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setStepWarning(getCheckoutStepWarning(TCheckoutStep.contactInfo)),
    );
  });

  it("allows navigation to shippingAddress when contact information is complete", () => {
    renderWithStepper(
      TCheckoutStep.contactInfo,
      [
        TCheckoutStep.contactInfo,
        TCheckoutStep.shippingAddress,
        TCheckoutStep.paymentMethod,
      ],
      [],
      orderWith({customer: completeCustomer(), services: []}),
    );

    clickStep(1);

    expect(mockDispatch).toHaveBeenCalledWith(
      setCurrentStep(TCheckoutStep.shippingAddress),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setStepWarning(getCheckoutStepWarning(TCheckoutStep.contactInfo)),
    );
  });
});
