import React from "react";
import {Form, Formik, FormikHelpers} from "formik";
import {Box, Button, TextField, Typography} from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import {useAppDispatch, useAppSelector} from "../../hooks/redux";
import {addFilledStep, setCurrentStep, setOrder} from "../../redux/reducers/app";
import {TCheckoutStep} from "../../types/common";
import {getCheckoutData, setLocalStorageCheckoutData} from "../../hooks/checkoutData";
import {fieldAttrs} from "../../lib/formUtils";
import {IOrderWithCustmAttr} from "../../types/Order";
import {useDeliveryTimes} from "../../hooks/useDeliveryTimes";
import {ordersDropShippingItems, ordersRegularItems} from "../../lib/products";

export interface IDeliveryDetailsFormValues {
  delivery_time: string;
  drop_ship_delivery_time?: string;
}

export const makeValidateDeliveryDetailsForm =
  (hasRegularItems: boolean, hasDropShipItems: boolean) =>
  (values: IDeliveryDetailsFormValues) => {
    const errors: Partial<Record<keyof IDeliveryDetailsFormValues, string>> = {};
    if (hasRegularItems && !values.delivery_time) {
      errors.delivery_time = "Delivery time is required";
    }
    if (hasDropShipItems && !values.drop_ship_delivery_time) {
      errors.drop_ship_delivery_time = "Drop-ship delivery time is required";
    }
    return errors;
  };

const useSaveDeliveryDetails = () => {
  const dispatch = useAppDispatch();
  const {order, items} = useAppSelector((state) => state.app);
  const dropShipItems = ordersDropShippingItems(items ?? []);
  const hasDropShipItems = dropShipItems.length > 0;
  const regularItems = ordersRegularItems(items ?? []);

  const onSubmit = (
    values: IDeliveryDetailsFormValues,
    {setSubmitting}: FormikHelpers<IDeliveryDetailsFormValues>
  ) => {
    const {order: checkoutDataOrder, total} = getCheckoutData() || {};
    if (!order || !checkoutDataOrder || !total) return;

    const updatedOrder: IOrderWithCustmAttr = {
      ...checkoutDataOrder,
      ...(hasRegularItems && {delivery_time: values.delivery_time}),
      ...(hasDropShipItems && {drop_ship_delivery_time: values.drop_ship_delivery_time}),
    };

    setLocalStorageCheckoutData({order: updatedOrder, total});
    dispatch(setOrder(updatedOrder));
    dispatch(addFilledStep({step: TCheckoutStep.deliveryDetails}));
    dispatch(setCurrentStep(TCheckoutStep.paymentMethod));
    setSubmitting(false);
  };

  const hasRegularItems = regularItems.length > 0;

  return {onSubmit, hasRegularItems, hasDropShipItems, dropShipItems, regularItems};
};

export default function DeliveryDetailsForm() {
  const {onSubmit, hasRegularItems, hasDropShipItems, dropShipItems, regularItems} = useSaveDeliveryDetails();
  const {order} = useAppSelector((state) => state.app);
  const {
    isLoading: loadingDeliveryTimes,
    isError: errorLoadingDeliveryTimes,
    data: deliveryTimes,
  } = useDeliveryTimes();

  const initialValues: IDeliveryDetailsFormValues = {
    delivery_time: hasRegularItems ? (order?.delivery_time ?? "") : "",
    ...(hasDropShipItems && {drop_ship_delivery_time: order?.drop_ship_delivery_time ?? ""}),
  };

  const deliveryTimeOptions = (
    <>
      <option value=""></option>
      {loadingDeliveryTimes ? (
        <option disabled value="">{"Loading delivery times..."}</option>
      ) : !errorLoadingDeliveryTimes && deliveryTimes ? (
        deliveryTimes.times.map((deliveryTime, idx) => (
          <option key={idx} value={deliveryTime}>
            {deliveryTime}
          </option>
        ))
      ) : (
        <option disabled>
          {"Error loading delivery times. Please contact info@cannabis-cottage.ca."}
        </option>
      )}
    </>
  );

  const nextDayHelperText = deliveryTimes?.isNextDay
    ? "NOTE: Delivery is closed for the day; your order will be delivered tomorrow."
    : "";

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={onSubmit}
      validate={makeValidateDeliveryDetailsForm(hasRegularItems, hasDropShipItems)}
      validateOnChange={false}
    >
      {(formikProps) => (
        <Form className={"bdl-delivery-details-form"}>
          <Typography variant="h5" sx={{mb: 2}}>
            {"Delivery details"}
          </Typography>

          {hasDropShipItems ? (
            <>
              {hasRegularItems && (
                <Box sx={{mb: 2}}>
                  <Typography variant="subtitle1" sx={{mb: 1}}>
                    {"Standard delivery"}
                  </Typography>
                  <Typography variant="body2" sx={{mb: 1}}>
                    {"Applies to: "}
                    {regularItems.map((item) => item.product.Name).join(", ")}
                  </Typography>
                  <TextField
                    required={true}
                    label="Delivery time"
                    variant={"outlined"}
                    fullWidth
                    select
                    slotProps={{select: {native: true}}}
                    helperText={nextDayHelperText}
                    {...fieldAttrs("delivery_time", formikProps)}
                  >
                    {deliveryTimeOptions}
                  </TextField>
                </Box>
              )}

              <Box sx={{mb: 2}}>
                <Typography variant="subtitle1" sx={{mb: 1}}>
                  {"Drop-ship delivery"}
                </Typography>
                <Typography variant="body2" sx={{mb: 1}}>
                  {"Applies to: "}
                  {dropShipItems.map((item) => item.product.Name).join(", ")}
                </Typography>
                <TextField
                  required={true}
                  label="Drop-ship delivery time"
                  variant={"outlined"}
                  fullWidth
                  select
                  slotProps={{select: {native: true}}}
                  helperText={nextDayHelperText}
                  {...fieldAttrs("drop_ship_delivery_time", formikProps)}
                >
                  {deliveryTimeOptions}
                </TextField>
              </Box>
            </>
          ) : (
            <Box sx={{mb: 2}}>
              <TextField
                required={true}
                label="Delivery time"
                variant={"outlined"}
                fullWidth
                select
                slotProps={{select: {native: true}}}
                helperText={nextDayHelperText}
                {...fieldAttrs("delivery_time", formikProps)}
              >
                {deliveryTimeOptions}
              </TextField>
            </Box>
          )}

          <Box textAlign={"end"}>
            <Button
              variant="contained"
              startIcon={<DoneIcon />}
              type={"submit"}
              disabled={formikProps.isSubmitting}
              color="success"
              size="large"
            >
              {"Continue to payment"}
            </Button>
          </Box>
        </Form>
      )}
    </Formik>
  );
}
