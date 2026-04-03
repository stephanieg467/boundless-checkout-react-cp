import React from "react";
import {Form, Formik, FormikHelpers} from "formik";
import {Box, Button, Skeleton, TextField, Typography} from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import {useAppDispatch, useAppSelector} from "../../hooks/redux";
import {addFilledStep, setCurrentStep, setOrder} from "../../redux/reducers/app";
import {TCheckoutStep} from "../../types/common";
import {getCheckoutData, setLocalStorageCheckoutData} from "../../hooks/checkoutData";
import {fieldAttrs} from "../../lib/formUtils";
import {IOrderWithCustmAttr} from "../../types/Order";
import {useDeliveryTimes} from "../../hooks/useDeliveryTimes";
import {RootState} from "../../redux/store";

export interface IDeliveryDetailsFormValues {
  delivery_time: string;
}

const validateDeliveryDetailsForm = (values: IDeliveryDetailsFormValues) => {
  const errors: Partial<Record<keyof IDeliveryDetailsFormValues, string>> = {};
  if (!values.delivery_time) {
    errors.delivery_time = "Delivery time is required";
  }
  return errors;
};

const getFormInitialValues = (): IDeliveryDetailsFormValues => {
  const order = useAppSelector((state: RootState) => state.app.order);
  return {
    delivery_time: order?.delivery_time ?? "",
  };
};

const useSaveDeliveryDetails = () => {
  const dispatch = useAppDispatch();
  const {order} = useAppSelector((state) => state.app);

  const onSubmit = (
    values: IDeliveryDetailsFormValues,
    {setSubmitting}: FormikHelpers<IDeliveryDetailsFormValues>
  ) => {
    const {order: checkoutDataOrder, total} = getCheckoutData() || {};
    if (!order || !checkoutDataOrder || !total) return;

    const updatedOrder: IOrderWithCustmAttr = {
      ...checkoutDataOrder,
      delivery_time: values.delivery_time,
    };

    setLocalStorageCheckoutData({order: updatedOrder, total});
    dispatch(setOrder(updatedOrder));
    dispatch(addFilledStep({step: TCheckoutStep.deliveryDetails}));
    dispatch(setCurrentStep(TCheckoutStep.paymentMethod));
    setSubmitting(false);
  };

  return {onSubmit};
};

export default function DeliveryDetailsForm() {
  const {onSubmit} = useSaveDeliveryDetails();
  const {
    isLoading: loadingDeliveryTimes,
    isError: errorLoadingDeliveryTimes,
    data: deliveryTimes,
  } = useDeliveryTimes();

  return (
    <Formik
      initialValues={getFormInitialValues()}
      onSubmit={onSubmit}
      validate={validateDeliveryDetailsForm}
      validateOnChange={false}
    >
      {(formikProps) => (
        <Form className={"bdl-delivery-details-form"}>
          <Typography variant="h5" sx={{mb: 2}}>
            Delivery details
          </Typography>
          <Box sx={{mb: 2}}>
            <TextField
              required={true}
              label="Delivery time"
              variant={"outlined"}
              fullWidth
              select
              slotProps={{
                select: {native: true},
              }}
              helperText={
                deliveryTimes?.isNextDay
                  ? "NOTE: Delivery is closed for the day; your order will be delivered tomorrow."
                  : ""
              }
              {...fieldAttrs("delivery_time", formikProps)}
            >
              <option value=""></option>
              {loadingDeliveryTimes ? (
                <Skeleton variant="rectangular" width={"100%"} height={56} />
              ) : !errorLoadingDeliveryTimes && deliveryTimes ? (
                deliveryTimes.times.map((deliveryTime, idx) => (
                  <option key={idx} value={deliveryTime}>
                    {deliveryTime}
                  </option>
                ))
              ) : (
                <option disabled>
                  Error loading delivery times. Please contact info@cannabis-cottage.ca
                </option>
              )}
            </TextField>
          </Box>
          <Box textAlign={"end"}>
            <Button
              variant="contained"
              startIcon={<DoneIcon />}
              type={"submit"}
              disabled={formikProps.isSubmitting}
              color="success"
              size="large"
            >
              Continue to payment
            </Button>
          </Box>
        </Form>
      )}
    </Formik>
  );
}
