import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';

// ── mocks ──────────────────────────────────────────────────────────────
const mockDispatch = jest.fn();
let mockState: any = {};

jest.mock('../hooks/redux', () => ({
  useAppSelector: (selector: any) => selector(mockState),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

import {setCurrentStep} from '../redux/reducers/app';
import CheckoutProgress from '../components/CheckoutProgress';
import { TCheckoutStep } from '../types/common';

const renderWithStepper = (currentStep: TCheckoutStep, steps: TCheckoutStep[], filledSteps: TCheckoutStep[] = []) => {
  mockState = {
    app: {
      stepper: {currentStep, steps, filledSteps},
    },
  };
  return render(<CheckoutProgress />);
};

describe('CheckoutProgress', () => {
  beforeEach(() => mockDispatch.mockClear());

  it('returns null when stepper is null', () => {
    mockState = {app: {stepper: null}};
    const {container} = render(<CheckoutProgress />);
    expect(container.firstChild).toBeNull();
  });

  it('marks the active step based on currentStep from Redux', () => {
    renderWithStepper(TCheckoutStep.paymentMethod, [
      TCheckoutStep.contactInfo,
      TCheckoutStep.paymentMethod,
    ]);
    // MUI Stepper renders step buttons — there should be 2
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('dispatches setCurrentStep when a step button is clicked', () => {
    mockDispatch.mockClear();

    // Start at contactInfo, but mark it as filled so we can navigate to paymentMethod
    renderWithStepper(
      TCheckoutStep.contactInfo,
      [TCheckoutStep.contactInfo, TCheckoutStep.paymentMethod],
      [TCheckoutStep.contactInfo]  // Mark contactInfo as filled
    );

    const buttons = screen.getAllByRole('button');
    const paymentMethodButton = buttons[1];

    fireEvent.click(paymentMethodButton);

    expect(mockDispatch).toHaveBeenCalledWith(
      setCurrentStep(TCheckoutStep.paymentMethod)
    );
  });
});
