import appReducer, {setCurrentStep} from "../redux/reducers/app";
import { TCheckoutStep } from "../types/common";

describe("app slice – setCurrentStep", () => {
  it("updates stepper.currentStep", () => {
    const initial = {
      isInited: true,
      show: true,
      globalError: null,
      stepper: {
        currentStep: TCheckoutStep.contactInfo,
        steps: [TCheckoutStep.contactInfo, TCheckoutStep.paymentMethod],
        filledSteps: [],
      },
    } as any;

    const next = appReducer(initial, setCurrentStep(TCheckoutStep.paymentMethod));
    expect(next.stepper?.currentStep).toBe(TCheckoutStep.paymentMethod);
  });

  it("is a no-op when stepper is null", () => {
    const initial = {isInited: false, show: false, globalError: null, stepper: null} as any;
    const next = appReducer(initial, setCurrentStep(TCheckoutStep.contactInfo));
    expect(next.stepper).toBeNull();
  });
});
