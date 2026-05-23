import {useCallback} from "react";
import {getCheckoutData, setLocalStorageCheckoutData} from "./checkoutData";
import {useAppDispatch} from "./redux";
import {setOrder, setTotal} from "../redux/reducers/app";
import {
  CreditCardPaymentOutcome,
  recordCreditCardPaymentOutcome,
} from "../lib/paymentOutcome";

export const useCreditCardPaymentOutcome = () => {
  const dispatch = useAppDispatch();

  const recordApprovedPayment = useCallback(
    (outcome: CreditCardPaymentOutcome) => {
      const checkoutData = getCheckoutData();

      if (!checkoutData?.order || !checkoutData.total) {
        throw new Error(
          "Cannot record credit-card payment outcome without an order and total.",
        );
      }

      const updatedSession = recordCreditCardPaymentOutcome(
        {order: checkoutData.order, total: checkoutData.total},
        outcome,
      );

      setLocalStorageCheckoutData({
        ...checkoutData,
        order: updatedSession.order,
        total: updatedSession.total,
      });

      dispatch(setOrder(updatedSession.order));
      dispatch(setTotal(updatedSession.total));

      return updatedSession;
    },
    [dispatch],
  );

  return {recordApprovedPayment};
};
