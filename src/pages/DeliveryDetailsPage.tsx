import React, {useEffect} from "react";
import CheckoutLayout from "../layout/CheckoutLayout";
import useInitCheckoutByCart from "../hooks/initCheckout";
import Loading from "../components/Loading";
import {useAppDispatch, useAppSelector} from "../hooks/redux";
import {setCurrentStep} from "../redux/reducers/app";
import {TCheckoutStep} from "../types/common";
import DeliveryDetailsForm from "./deliveryDetailsPage/DeliveryDetailsForm";

export default function DeliveryDetailsPage() {
  const {isInited} = useInitCheckoutByCart();
  const {stepper} = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.title = "Checkout: Delivery details";
  }, []); // eslint-disable-line

  useEffect(() => {
    if (stepper && !stepper.filledSteps.includes(TCheckoutStep.shippingAddress)) {
      dispatch(setCurrentStep(TCheckoutStep.shippingAddress));
    }
  }, [stepper, dispatch]);

  if (!isInited) return <Loading />;

  return (
    <CheckoutLayout>
      <DeliveryDetailsForm />
    </CheckoutLayout>
  );
}
