import React, {useEffect} from "react";
import CheckoutLayout from "../layout/CheckoutLayout";
import useInitCheckoutByCart from "../hooks/initCheckout";
import Loading from "../components/Loading";
import {useAppDispatch, useAppSelector} from "../hooks/redux";
import {setCurrentStep, setStepWarning} from "../redux/reducers/app";
import {TCheckoutStep} from "../types/common";
import DeliveryDetailsForm from "./deliveryDetailsPage/DeliveryDetailsForm";
import {
  getCheckoutStepWarning,
  getFirstIncompleteCheckoutStep,
} from "../lib/checkoutGuards";

export default function DeliveryDetailsPage() {
  const {isInited} = useInitCheckoutByCart();
  const {stepper, order} = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.title = "Checkout: Delivery details";
  }, []);  

  useEffect(() => {
    if (!isInited || !stepper) return;

    const firstIncompleteStep = getFirstIncompleteCheckoutStep(order, stepper);
    if (
      firstIncompleteStep &&
      stepper.steps.indexOf(firstIncompleteStep) < stepper.steps.indexOf(TCheckoutStep.deliveryDetails)
    ) {
      dispatch(setCurrentStep(firstIncompleteStep));
      dispatch(setStepWarning(getCheckoutStepWarning(firstIncompleteStep)));
    }
  }, [isInited, stepper, order, dispatch]);

  if (!isInited) return <Loading />;

  return (
    <CheckoutLayout>
      <DeliveryDetailsForm />
    </CheckoutLayout>
  );
}
